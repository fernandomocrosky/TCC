import { generateAndAnalyzeResume } from "./atsAnalyzer";

export function generateResume(input) {
  const { resumeText, analysis } = generateAndAnalyzeResume(input);

  return {
    text: resumeText,
    analysis,
  };
}

