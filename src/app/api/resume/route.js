import { NextResponse } from "next/server";
import { generateResumeWithOpenAI } from "../../../lib/openaiResumeGenerator";
import { buildResumeTextFromInput } from "../../../lib/keywordExtractor";
import { analyzeResume } from "../../../lib/atsAnalyzer";

export async function POST(req) {
  try {
    const body = await req.json();

    let resumeText = null;
    try {
      resumeText = await generateResumeWithOpenAI(body);
    } catch (err) {
      console.warn("OpenAI resume generation failed, using fallback:", err.message);
    }

    if (!resumeText || !resumeText.trim()) {
      resumeText = buildResumeTextFromInput(body);
    }

    const analysis = analyzeResume(body, resumeText);

    return NextResponse.json({
      text: resumeText,
      analysis,
    });
  } catch (error) {
    console.error("Error generating resume", error);
    return NextResponse.json(
      { error: error.message || "Falha ao gerar currículo" },
      { status: 400 }
    );
  }
}

