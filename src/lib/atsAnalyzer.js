import { buildResumeTextFromInput } from "./keywordExtractor";
import { analyzeResumeWithOpenAI } from "./openaiAtsAnalyzer";

async function analyzeResume(input, resumeText) {
  const result = await analyzeResumeWithOpenAI(input, resumeText);
  if (!result) {
    throw new Error(
      "Análise ATS indisponível: verifique OPENAI_API_KEY e tente novamente."
    );
  }
  return result;
}

async function generateAndAnalyzeResume(input) {
  const resumeText = buildResumeTextFromInput(input);
  const analysis = await analyzeResume(input, resumeText);
  return { resumeText, analysis };
}

export { analyzeResume, generateAndAnalyzeResume };
