import { NextResponse } from "next/server";
import { analyzeResume } from "../../../lib/atsAnalyzer";

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

    const input = {
      candidate: {},
      workExperience: [],
      education: [],
      skills: [],
      jobDescription,
    };

    const analysis = analyzeResume(input, resumeText);
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Erro ao analisar currículo:", err);
    return NextResponse.json(
      { error: err.message || "Falha ao analisar." },
      { status: 500 }
    );
  }
}
