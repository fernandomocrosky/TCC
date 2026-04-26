/**
 * Gera/refina texto de currículo usando a API da OpenAI.
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

  return `Você é um especialista em redação de currículos para processos seletivos. Gere um currículo otimizado para a vaga e para ATS, em **Markdown** (para leitura humana na tela).

FORMATO OBRIGATÓRIO (Markdown):
1) Use \`##\` para cada bloco principal, com título curto em português, por exemplo: \`## Contato\`, \`## Resumo profissional\`, \`## Experiência profissional\`, \`## Formação acadêmica\`, \`## Habilidades técnicas\`, \`## Idiomas\`. Inclua somente seções que tenham dados.
2) Logo após o título do documento: linha com **Nome completo** e, na linha seguinte, cargo desejado em negrito se existir (ex.: **Desenvolvedor Back-End**).
3) Em **Contato**, NÃO use lista. Escreva linhas separadas com rótulo em negrito (ex.: **E-mail:** ..., **Telefone:** ..., **Localização:** ..., **LinkedIn:** ...). Use quebra de linha entre os campos.
4) **Resumo**: NÃO use lista. Escreva um parágrafo único curto e objetivo (2–5 frases), sem bullets.
5) **Experiência**: para cada cargo, use \`### Empresa — Cargo (período)\` e abaixo bullets com responsabilidades/conquistas (texto derivado da descrição fornecida). Sem parágrafos longos em experiência.
6) **Formação**: bullets, um curso/instituição por item.
7) **Habilidades**: organize por **subcategorias** com negrito dentro dos itens, por exemplo:
   - **Linguagens & runtime:** Node.js, …
   - **Dados:** PostgreSQL, …
   Use apenas habilidades presentes nos dados; se não der para agrupar, use uma lista única de bullets.
8) **Idiomas**: bullets (ex.: **Português** — nativo).
9) Não use cercas de código (\`\`\`). Não use tabelas HTML. Texto em português. Sem introdução (“Segue o currículo”) nem comentários finais.

REGRAS DE CONTEÚDO:
1. Use APENAS os dados fornecidos abaixo. NUNCA invente ou use placeholders como [Nome da Instituição], [Curso], [Data], [Nome da Empresa], [Cargo], etc.
2. Inclua SOMENTE as seções para as quais há dados:
   - Resumo: só se o candidato tiver resumo.
   - Experiência: só se houver experiências (${hasExperience ? "há experiências" : "NÃO há — não inclua esta seção"}).
   - Formação: só se houver formação (${hasEducation ? "há formação" : "NÃO há — não inclua esta seção"}).
   - Habilidades: só se houver habilidades (${hasSkills ? "há habilidades" : "NÃO há — não inclua esta seção"}).
   - Idiomas: só se houver idiomas (${hasLanguages ? "há idiomas" : "NÃO há — não inclua esta seção"}).

DADOS DO CANDIDATO (use apenas isto):
${candidateBlock}
${experienceBlock}
${educationBlock}
${skillsBlock}
${languagesBlock}

DESCRIÇÃO DA VAGA:
${jd}

Gere apenas o Markdown do currículo.`;
}

async function requestOpenAIResume(prompt, { temperature = 0.5, maxTokens = 2000 } = {}) {
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
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
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

export async function generateResumeWithOpenAI(input) {
  return requestOpenAIResume(buildPrompt(input), { temperature: 0.5, maxTokens: 2000 });
}

function buildRefinementPrompt(input, currentResumeText, suggestions) {
  const safeSuggestions = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];
  return `Você é um especialista em ATS e redação de currículos.
Revise o currículo abaixo aplicando as sugestões de melhoria, mas seguindo regras rígidas:

REGRAS OBRIGATÓRIAS:
1. Não invente dados, empresas, datas, cursos, certificações ou resultados.
2. Use apenas informações já presentes no currículo atual e nos dados do candidato.
3. Mantenha o mesmo formato **Markdown** da versão inicial: títulos \`##\`, \`###\` para cada experiência, contato em linhas com rótulos (**E-mail:**, **Telefone:** etc.), resumo em parágrafo (sem lista), e subcategorias em **negrito** em habilidades quando fizer sentido.
4. Preserve o idioma em português.
5. Se alguma sugestão exigir dado inexistente, ignore essa sugestão.
6. Não use cercas \`\`\` nem tabelas.

DADOS DO CANDIDATO:
${JSON.stringify(input || {}, null, 2)}

CURRÍCULO ATUAL:
${currentResumeText || ""}

SUGESTÕES DE MELHORIA:
${safeSuggestions.length ? safeSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") : "Nenhuma"}

Retorne somente a versão final revisada do currículo.`;
}

export async function refineResumeWithOpenAI(input, currentResumeText, suggestions) {
  if (!currentResumeText || !currentResumeText.trim()) return null;
  const prompt = buildRefinementPrompt(input, currentResumeText, suggestions);
  return requestOpenAIResume(prompt, { temperature: 0.3, maxTokens: 2200 });
}
