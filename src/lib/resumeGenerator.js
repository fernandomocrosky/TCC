import { generateAndAnalyzeResume } from "./atsAnalyzer";

export async function generateResume(input) {
  const { resumeText, analysis } = await generateAndAnalyzeResume(input);

  return {
    text: resumeText,
    analysis,
  };
}

