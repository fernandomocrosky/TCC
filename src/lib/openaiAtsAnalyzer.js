/**
 * Análise ATS via OpenAI (sem heurísticas léxicas locais).
 * Requer OPENAI_API_KEY.
 */

function extractJsonPayload(rawText) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function clampScore(value) {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function buildPrompt({ jobDescription, resumeText, skills, workExperience }) {
  return `
Você é especialista em ATS e recrutamento técnico.
Analise o alinhamento entre o currículo e a descrição da vaga.

Retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON) neste formato:
{
  "atsScore": <inteiro 0-100>,
  "keywordMatch": <inteiro 0-100>,
  "skillsMatch": <inteiro 0-100>,
  "experienceScore": <inteiro 0-100>,
  "semanticSimilarity": <inteiro 0-100>,
  "formattingScore": <inteiro 0-100>,
  "suggestions": ["...", "..."]
}

Critérios (todos 0-100):
- keywordMatch: termos técnicos e requisitos explícitos da vaga presentes e bem usados no currículo.
- skillsMatch: stack, ferramentas e competências pedidas vs. evidenciadas no currículo ou na lista de habilidades.
- experienceScore: relevância das experiências para a vaga (inferir pelo texto do currículo e pelo JSON de experiências, se houver).
- semanticSimilarity: proximidade geral de perfil (área, senioridade, tipo de trabalho).
- formattingScore: clareza, seções bem separadas (ex.: títulos e listas), leitura escaneável; o currículo pode estar em Markdown leve (##, bullets) — isso é positivo se organizado, não penalize só por uso de Markdown.
- atsScore: nota geral coerente com os demais critérios (reflexo do conjunto, não uma média matemática obrigatória).

Regras:
1) Use apenas inteiros de 0 a 100 em cada nota.
2) suggestions: no máximo 8 strings, em português, curtas e acionáveis; cite lacunas reais; não invente empregos, datas ou tecnologias que não apareçam no currículo.
3) Se o currículo estiver vazio ou muito pobre, notas baixas e sugestões honestas.

DESCRIÇÃO DA VAGA:
${jobDescription || ""}

CURRÍCULO (texto completo):
${resumeText || ""}

HABILIDADES DECLARADAS (lista):
${JSON.stringify(skills || [])}

EXPERIÊNCIAS ESTRUTURADAS (JSON; pode ser []):
${JSON.stringify(workExperience || [])}
`.trim();
}

/**
 * @param {object} input - payload do formulário (candidate, workExperience, skills, jobDescription, …)
 * @param {string} resumeText - texto do currículo a avaliar
 * @returns {Promise<object|null>} mesmo formato que o front espera, ou null se falhar
 */
export async function analyzeResumeWithOpenAI(input, resumeText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;

  const jobDescription = input.jobDescription || "";
  const skills = input.skills || [];
  const workExperience = input.workExperience || [];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 1400,
        messages: [
          {
            role: "user",
            content: buildPrompt({
              jobDescription,
              resumeText,
              skills,
              workExperience,
            }),
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    const parsed = extractJsonPayload(content);
    if (!parsed || typeof parsed !== "object") return null;

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 8)
      : [];

    return {
      atsScore: clampScore(parsed.atsScore),
      keywordMatch: clampScore(parsed.keywordMatch),
      skillsMatch: clampScore(parsed.skillsMatch),
      experienceScore: clampScore(parsed.experienceScore),
      semanticSimilarity: clampScore(parsed.semanticSimilarity),
      formattingScore: clampScore(parsed.formattingScore),
      suggestions,
    };
  } catch {
    return null;
  }
}
