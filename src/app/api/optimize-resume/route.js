import { NextResponse } from "next/server";
import { analyzeResume } from "../../../lib/atsAnalyzer";
import { optimizeResumeFromExistingWithOpenAI } from "../../../lib/openaiResumeGenerator";

export async function POST(req) {
  try {
    const body = await req.json();
    const resumeText = body.resumeText?.trim() ?? "";
    const jobDescription = body.jobDescription?.trim() ?? "";

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Envie o texto do currículo e a descrição da vaga." },
        { status: 400 }
      );
    }

    const optimizedText = await optimizeResumeFromExistingWithOpenAI(
      resumeText,
      jobDescription
    );

    if (!optimizedText || !optimizedText.trim()) {
      return NextResponse.json(
        { error: "Não foi possível otimizar o currículo com IA." },
        { status: 500 }
      );
    }

    const analysisInput = {
      candidate: {},
      workExperience: [],
      education: [],
      skills: [],
      jobDescription,
    };

    const analysis = await analyzeResume(analysisInput, optimizedText);
    return NextResponse.json({ text: optimizedText, analysis });
  } catch (err) {
    console.error("Erro ao otimizar currículo:", err);
    return NextResponse.json(
      { error: err.message || "Falha ao otimizar currículo." },
      { status: 500 }
    );
  }
}
