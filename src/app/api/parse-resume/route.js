import { NextResponse } from "next/server";
import path from "path";
import { PDFParse } from "pdf-parse";
import { parseResumeText } from "../../../lib/pdfResumeParser";

// Caminho absoluto do worker do PDF.js para evitar erro "Cannot find module pdf.worker.mjs" no Next
const workerPath = path.join(
  process.cwd(),
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.worker.mjs"
);
PDFParse.setWorker(workerPath);

export async function POST(req) {
  try {
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
        { error: "Não foi possível extrair texto do PDF. Verifique se o arquivo não está protegido ou é uma imagem." },
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
