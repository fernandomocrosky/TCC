import {
  buildResumeTextFromInput,
  extractKeywords,
  extractRequiredSkillsFromJobDescription,
} from "./keywordExtractor";
import { cosineSimilarity } from "./similarityAnalyzer";

function jaccardSimilarity(a, b) {
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  return intersection.size / union.size;
}

function computeKeywordMatchScore(resumeText, jobDescription) {
  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);

  const jdSet = new Set(jdKeywords.slice(0, 50));
  const resumeSet = new Set(resumeKeywords.slice(0, 200));

  let matched = 0;
  const missing = [];

  for (const kw of jdSet) {
    if (resumeSet.has(kw)) {
      matched += 1;
    } else {
      missing.push(kw);
    }
  }

  const score = jdSet.size ? (matched / jdSet.size) * 100 : 0;

  return {
    score: Math.round(score),
    missingKeywords: missing,
  };
}

function computeSkillsMatchScore(jobDescription, candidateSkills) {
  const requiredSkills = extractRequiredSkillsFromJobDescription(
    jobDescription,
    candidateSkills
  );

  const jdSkillsSet = new Set(
    requiredSkills.map((s) => String(s || "").toLowerCase().trim()).filter(Boolean)
  );
  const candidateSet = new Set(
    (candidateSkills || [])
      .map((s) => String(s || "").toLowerCase().trim())
      .filter(Boolean)
  );

  let matched = 0;
  for (const s of jdSkillsSet) {
    if (candidateSet.has(s)) matched += 1;
  }

  const score = jdSkillsSet.size ? (matched / jdSkillsSet.size) * 100 : 0;
  const missingSkills = [...jdSkillsSet].filter((s) => !candidateSet.has(s));

  return {
    score: Math.round(score),
    missingSkills,
  };
}

function computeExperienceRelevanceScore(input) {
  const workExperience = input.workExperience || [];
  const jobDescription = input.jobDescription || "";
  const suggestions = [];

  if (!workExperience.length) {
    suggestions.push("Adicionar experiências profissionais relevantes.");
    return { score: 0, suggestions };
  }

  const jdKeywords = new Set(extractKeywords(jobDescription).slice(0, 50));

  let totalRelevance = 0;
  for (const exp of workExperience) {
    const expKeywords = new Set(
      extractKeywords(exp.description || "").slice(0, 100)
    );
    const overlap = jaccardSimilarity(jdKeywords, expKeywords);
    totalRelevance += overlap;
  }

  const avgRelevance = totalRelevance / workExperience.length;
  const score = Math.round(avgRelevance * 100);

  if (score < 70) {
    suggestions.push(
      "Reescrever descrições de experiência usando termos e resultados alinhados à vaga."
    );
  }

  return { score, suggestions };
}

function computeFormattingScore(resumeText) {
  const suggestions = [];
  let score = 100;

  const hasTablesOrColumns =
    /<table|<\/table>|\t{2,}| {4,}\S+ {2,}\S+/.test(resumeText);
  if (hasTablesOrColumns) {
    score -= 20;
    suggestions.push(
      "Evitar tabelas ou colunas complexas; usar layout simples em texto."
    );
  }

  const hasClearSections =
    /SUMMARY|EXPERIENCE|EDUCATION|SKILLS/i.test(resumeText);
  if (!hasClearSections) {
    score -= 30;
    suggestions.push(
      "Adicionar seções claramente rotuladas como SUMMARY, EXPERIENCE, EDUCATION e SKILLS."
    );
  }

  const hasExcessiveFormattingChars = /[*_•●▪■]/.test(resumeText);
  if (hasExcessiveFormattingChars) {
    score -= 10;
    suggestions.push(
      "Reduzir uso de bullets não padrão (*, •, ●); usar hifens ou pontos simples."
    );
  }

  if (score < 0) score = 0;

  return { score, suggestions };
}

function analyzeResume(input, resumeText) {
  const jobDescription = input.jobDescription || "";
  const skills = input.skills || [];

  const keywordResult = computeKeywordMatchScore(resumeText, jobDescription);
  const skillsResult = computeSkillsMatchScore(jobDescription, skills);
  const experienceResult = computeExperienceRelevanceScore(input);
  const formattingResult = computeFormattingScore(resumeText);

  const semanticSimilarity = cosineSimilarity(resumeText, jobDescription) * 100;

  const atsScore = Math.round(
    (keywordResult.score * 0.25 +
      skillsResult.score * 0.2 +
      experienceResult.score * 0.25 +
      semanticSimilarity * 0.2 +
      formattingResult.score * 0.1) /
      (0.25 + 0.2 + 0.25 + 0.2 + 0.1)
  );

  const suggestions = [
    ...(keywordResult.missingKeywords.length
      ? [
          "Incluir ou reforçar palavras‑chave da vaga como: " +
            keywordResult.missingKeywords.slice(0, 10).join(", "),
        ]
      : []),
    ...(skillsResult.missingSkills.length
      ? [
          "Destacar no currículo habilidades relevantes para a vaga: " +
            skillsResult.missingSkills.slice(0, 10).join(", "),
        ]
      : []),
    ...experienceResult.suggestions,
    ...formattingResult.suggestions,
  ];

  return {
    atsScore,
    keywordMatch: keywordResult.score,
    skillsMatch: skillsResult.score,
    experienceScore: experienceResult.score,
    semanticSimilarity: Math.round(semanticSimilarity),
    formattingScore: formattingResult.score,
    suggestions,
  };
}

function generateAndAnalyzeResume(input) {
  const resumeText = buildResumeTextFromInput(input);
  const analysis = analyzeResume(input, resumeText);
  return { resumeText, analysis };
}

export { analyzeResume, generateAndAnalyzeResume };

