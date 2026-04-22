import { NextResponse } from "next/server";
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { parseResumeText } from "../../../lib/pdfResumeParser";

const require = createRequire(import.meta.url);

/**
 * Worker empacotado no repositório (public/workers). Na Vercel, ficheiros em
 * node_modules nem sempre existem no runtime; public/ vai sempre no deploy.
 * Após atualizar pdfjs-dist: `npm run sync-pdf-worker`
 */
const BUNDLED_WORKER = path.join(
  process.cwd(),
  "public",
  "workers",
  "pdf.worker.mjs"
);

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

/**
 * No Node, o worker do PDF.js precisa ser `file:` (ou `data:`), nunca `https:`.
 */
function configurePdfWorker(PDFParse) {
  let workerAbs = null;

  if (fs.existsSync(BUNDLED_WORKER)) {
    workerAbs = BUNDLED_WORKER;
  } else {
    try {
      const resolved = require.resolve(
        "pdfjs-dist/legacy/build/pdf.worker.mjs"
      );
      if (fs.existsSync(resolved)) workerAbs = resolved;
    } catch {
      /* ignora */
    }
  }

  if (!workerAbs) {
    throw new Error(
      "Worker do PDF não encontrado. Execute `npm run sync-pdf-worker`, faça commit de `public/workers/pdf.worker.mjs` e redeploy."
    );
  }

  PDFParse.setWorker(pathToFileURL(workerAbs).href);
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
