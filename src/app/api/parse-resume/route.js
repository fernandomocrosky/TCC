import { NextResponse } from "next/server";
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { parseResumeText } from "../../../lib/pdfResumeParser";

const require = createRequire(import.meta.url);

/** Mesma versão do pdf-parse em package.json — CDN só como fallback. */
const PDF_PARSE_PKG_VERSION = "2.4.5";

/**
 * pdf.js (via pdf-parse) usa DOMMatrix no Node; na Vercel não existe sem polyfill.
 * Precisa rodar ANTES de importar `pdf-parse` (por isso import dinâmico abaixo).
 */
function ensureDomMatrixPolyfill() {
  if (typeof globalThis.DOMMatrix !== "undefined") return;
  const mod = require("dommatrix");
  const DOMMatrixImpl = mod.default ?? mod;
  globalThis.DOMMatrix = DOMMatrixImpl;
}

function configurePdfWorker(PDFParse) {
  try {
    const pkgPath = require.resolve("pdfjs-dist/package.json");
    const root = path.dirname(pkgPath);
    const workerAbs = path.join(root, "legacy", "build", "pdf.worker.mjs");
    if (fs.existsSync(workerAbs)) {
      PDFParse.setWorker(pathToFileURL(workerAbs).href);
      return;
    }
  } catch (e) {
    console.warn("[parse-resume] worker local indisponível:", e?.message);
  }
  PDFParse.setWorker(
    `https://cdn.jsdelivr.net/npm/pdf-parse@${PDF_PARSE_PKG_VERSION}/dist/pdf-parse/web/pdf.worker.mjs`
  );
}

export async function POST(req) {
  try {
    ensureDomMatrixPolyfill();
    const { PDFParse } = await import("pdf-parse");
    configurePdfWorker(PDFParse);

    const formData = await req.formData();
    const file = formData.get("file") ?? formData.get("resume");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Envie um arquivo PDF (campo 'file' ou 'resume')." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText({ parseHyperlinks: true });
    await parser.destroy();

    if (!text || !text.trim()) {
      return NextResponse.json(
        {
          error:
            "Não foi possível extrair texto do PDF. Verifique se o arquivo não está protegido ou é uma imagem.",
        },
        { status: 400 }
      );
    }

    const parsed = parseResumeText(text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Erro ao processar PDF:", err);
    return NextResponse.json(
      { error: err.message || "Falha ao processar o PDF." },
      { status: 500 }
    );
  }
}
