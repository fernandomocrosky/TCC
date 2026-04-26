function buildResumeTextFromInput(input) {
  const lines = [];

  const candidate = input.candidate || {};
  const workExperience = input.workExperience || [];
  const education = input.education || [];
  const skills = input.skills || [];
  const languages = input.languages || [];

  const nameLine =
    `${candidate.name || ""}${candidate.title ? " — " + candidate.title : ""}`.trim();
  if (nameLine) {
    lines.push(`## Identificação`);
    lines.push("");
    lines.push(`**${candidate.name || "Candidato"}**`);
    if (candidate.title) {
      lines.push("");
      lines.push(`**${candidate.title}**`);
    }
  }

  const contactLines = [];
  if (candidate.email) contactLines.push(`**E-mail:** ${candidate.email}  `);
  if (candidate.phone) contactLines.push(`**Telefone:** ${candidate.phone}  `);
  if (candidate.location) contactLines.push(`**Localização:** ${candidate.location}  `);
  if (candidate.linkedin) contactLines.push(`**LinkedIn:** ${candidate.linkedin}  `);
  if (candidate.github) contactLines.push(`**GitHub:** ${candidate.github}  `);
  if (candidate.website) contactLines.push(`**Website:** ${candidate.website}`);
  if (contactLines.length) {
    lines.push("");
    lines.push(`## Contato`);
    lines.push("");
    contactLines.forEach((line) => lines.push(line));
  }

  if (candidate.summary) {
    lines.push("");
    lines.push(`## Resumo profissional`);
    lines.push("");
    const summaryText = candidate.summary
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    if (summaryText) lines.push(summaryText);
  }

  if (workExperience.length) {
    lines.push("");
    lines.push(`## Experiência profissional`);
    lines.push("");
    for (const exp of workExperience) {
      const dateRange = `${exp.startDate || ""} - ${
        exp.current ? "Atual" : exp.endDate || ""
      }`.trim();
      const header = [exp.company, exp.role].filter(Boolean).join(" — ");
      lines.push(`### ${header}${dateRange ? ` (${dateRange})` : ""}`);
      lines.push("");
      if (exp.description) {
        exp.description
          .split(/\n+/)
          .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
          .filter(Boolean)
          .forEach((b) => lines.push(`- ${b}`));
      }
      lines.push("");
    }
  }

  if (education.length) {
    lines.push(`## Formação acadêmica`);
    lines.push("");
    for (const edu of education) {
      const dateRange =
        edu.startDate || edu.endDate
          ? `${edu.startDate || ""} - ${edu.endDate || ""}`.trim()
          : "";
      const bits = [
        edu.degree,
        edu.field,
        edu.institution,
        dateRange ? `(${dateRange})` : "",
      ].filter(Boolean);
      lines.push(`- ${bits.join(" · ")}`);
    }
  }

  if (skills.length) {
    lines.push("");
    lines.push(`## Habilidades técnicas`);
    lines.push("");
    lines.push(`- **Geral:** ${skills.join(", ")}`);
  }

  if (languages.length) {
    lines.push("");
    lines.push(`## Idiomas`);
    lines.push("");
    languages.forEach((lang) => lines.push(`- ${lang}`));
  }

  return lines.join("\n").trim();
}

export { buildResumeTextFromInput };
