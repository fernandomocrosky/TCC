import { NextResponse } from "next/server";
import {
  generateResumeWithOpenAI,
  refineResumeWithOpenAI,
} from "../../../lib/openaiResumeGenerator";
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

    let analysis = await analyzeResume(body, resumeText);

    const refineEnabled = process.env.ATS_REFINE_WITH_SUGGESTIONS !== "false";
    if (refineEnabled && analysis?.suggestions?.length) {
      try {
        const refinedResume = await refineResumeWithOpenAI(
          body,
          resumeText,
          analysis.suggestions
        );
        if (refinedResume && refinedResume.trim()) {
          const refinedAnalysis = await analyzeResume(body, refinedResume);
          if ((refinedAnalysis?.atsScore ?? 0) >= (analysis?.atsScore ?? 0)) {
            resumeText = refinedResume;
            analysis = refinedAnalysis;
          }
        }
      } catch (err) {
        console.warn("OpenAI resume refinement failed, keeping initial version:", err.message);
      }
    }

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

