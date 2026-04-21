/**
 * Gera texto de currículo personalizado para a vaga usando a API da OpenAI.
 * Requer OPENAI_API_KEY em .env.local
 */

function buildPrompt(input) {
  const c = input.candidate || {};
  const exp = input.workExperience || [];
  const edu = input.education || [];
  const skills = input.skills || [];
  const languages = input.languages || [];
  const jd = input.jobDescription || "";

  const candidateBlock = `
DADOS DO CANDIDATO:
- Nome: ${c.name || ""}
- Título/Cargo desejado: ${c.title || ""}
- Resumo/Objetivo: ${c.summary || ""}
- Localização: ${c.location || ""}
- E-mail: ${c.email || ""}
- Telefone: ${c.phone || ""}
- LinkedIn: ${c.linkedin || ""}
- GitHub: ${c.github || ""}
- Website: ${c.website || ""}
`.trim();

  const experienceBlock =
    exp.length > 0
      ? `
EXPERIÊNCIAS PROFISSIONAIS:
${exp
  .map(
    (e) =>
      `- ${e.role || ""} na ${e.company || ""} (${e.startDate || ""} - ${e.current ? "Presente" : e.endDate || ""})\n  ${e.description || ""}`
  )
  .join("\n\n")}`
      : "";

  const educationBlock =
    edu.length > 0
      ? `
FORMAÇÃO:
${edu
  .map(
    (e) =>
      `- ${e.degree || ""}${e.field ? " - " + e.field : ""} | ${e.institution || ""} (${e.startDate || ""} - ${e.endDate || ""})`
  )
  .join("\n")}`
      : "";

  const skillsBlock =
    skills.length > 0 ? `\nHABILIDADES: ${skills.join(", ")}` : "";
  const languagesBlock =
    languages.length > 0 ? `\nIDIOMAS: ${languages.join(", ")}` : "";

  const hasExperience = exp.length > 0;
  const hasEducation = edu.length > 0;
  const hasSkills = skills.length > 0;
  const hasLanguages = languages.length > 0;

  return `Você é um especialista em redação de currículos para processos seletivos. Gere um currículo em texto puro (sem markdown, sem asteriscos), otimizado para a vaga abaixo e para sistemas ATS.

REGRAS OBRIGATÓRIAS:
1. Use APENAS os dados fornecidos abaixo. NUNCA invente ou use placeholders como [Nome da Instituição], [Curso], [Data], [Nome da Empresa], [Cargo], etc.
2. Inclua SOMENTE as seções para as quais há dados:
   - RESUMO/SUMMARY: só se o candidato tiver resumo.
   - EXPERIÊNCIA/EXPERIENCE: só se houver experiências listadas abaixo (${hasExperience ? "há experiências" : "NÃO há — não inclua esta seção"}).
   - FORMAÇÃO/EDUCATION: só se houver formação listada abaixo (${hasEducation ? "há formação" : "NÃO há — não inclua esta seção"}).
   - HABILIDADES/SKILLS: só se houver habilidades listadas (${hasSkills ? "há habilidades" : "NÃO há — não inclua esta seção"}).
   - IDIOMAS/LANGUAGES: só se houver idiomas listados (${hasLanguages ? "há idiomas" : "NÃO há — não inclua esta seção"}).
3. No topo: nome, título (se houver), e uma linha de contato com os dados reais (localização, e-mail, telefone, LinkedIn, GitHub, website — apenas os que forem fornecidos).
4. Use apenas quebras de linha. Seções em MAIÚSCULAS. Texto em português. Sem introdução ou comentários.

DADOS DO CANDIDATO (use apenas isto):
${candidateBlock}
${experienceBlock}
${educationBlock}
${skillsBlock}
${languagesBlock}

DESCRIÇÃO DA VAGA:
${jd}

Gere apenas o texto do currículo.`;
}

export async function generateResumeWithOpenAI(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}
