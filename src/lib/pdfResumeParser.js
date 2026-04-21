/**
 * Extrai do texto do currículo APENAS:
 * - Nome completo
 * - Resumo
 * - E-mail
 * - Telefone
 * - LinkedIn
 * - GitHub
 * - Website
 * - Habilidades
 */
const BULLET_REGEX = /^[\s]*[•\-*▪●◦○◆\u2022\u2023\u2043]+\s*/gm;
const PAGE_BREAK_RE = /\s*--\s*\d+\s+of\s+\d+\s*--\s*$/g;

function stripBullets(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(BULLET_REGEX, "")
    .replace(/\n\s*[•\-*▪●◦○◆\u2022\u2023\u2043]+\s*/g, "\n")
    .trim();
}

function parseResumeText(rawText) {
  const text = String(rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2}\)?[-.\s]?)?\d{4,5}[-.\s]?\d{4}/g;
  const markdownLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  const mailtoRegex = /\[([^\]]*)\]\((mailto:([^)\s]+))\)/gi;
  const urlsFromLinks = [];
  let m;
  while ((m = markdownLinkRegex.exec(text)) !== null) {
    urlsFromLinks.push(m[2].replace(/\)$/, "").trim());
  }
  const emailsFromMailto = [];
  let mailtoMatch;
  while ((mailtoMatch = mailtoRegex.exec(text)) !== null) {
    const addr = mailtoMatch[3]?.replace(/^mailto:/i, "").trim();
    if (addr) emailsFromMailto.push(addr);
  }
  const emailsFromText = text.match(emailRegex) || [];
  const emails = [...new Set([...emailsFromMailto, ...emailsFromText])];
  const phones = [...new Set((text.match(phoneRegex) || []))];
  function normalizeUrl(url) {
    if (!url || typeof url !== "string") return "";
    const u = url.replace(/\)$/, "").trim();
    if (!u) return "";
    return /^https?:\/\//i.test(u) ? u : "https://" + u;
  }
  const linkedinRaw =
    urlsFromLinks.find((u) => /linkedin\.com/i.test(u)) ||
    (text.match(/linkedin\.com\/[^\s)\]]+/gi) || [])[0];
  const githubRaw =
    urlsFromLinks.find((u) => /github\.com/i.test(u)) ||
    (text.match(/github\.com\/[^\s)\]]+/gi) || [])[0];
  const websiteRaw = urlsFromLinks.find(
    (u) => !/linkedin\.com|github\.com/i.test(u)
  );
  const linkedinUrl = normalizeUrl(linkedinRaw);
  const githubUrl = normalizeUrl(githubRaw);
  const websiteUrl = normalizeUrl(websiteRaw);

  const sectionHeaders = [
    /^habilidades(\s*e?\s*compet[eê]ncias)?$/i,
    /^skills$/i,
    /^compet[eê]ncias$/i,
    /^idiomas?$/i,
    /^languages?$/i,
    /^cursos?\s*(e|and)?\s*qualifica[cç][oõ]es?$/i,
    /^qualifica[cç][oõ]es?$/i,
    /^informa[cç][oõ]es?\s*adicionais?$/i,
    /^experi[eê]ncia(s)?\s*(profissional(is)?)?$/i,
    /^experience(s)?$/i,
    /^forma[cç][aã]o(\s*acad[eê]mica)?$/i,
    /^education$/i,
    /^resumo(\s*profissional)?$/i,
    /^objetivo(s)?$/i,
  ];

  function findSectionRanges() {
    const ranges = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const re of sectionHeaders) {
        if (re.test(line)) {
          ranges.push({ index: i, title: line });
          break;
        }
      }
    }
    return ranges;
  }

  const ranges = findSectionRanges();

  function getSectionContent(sectionNamePatterns) {
    const startIndexes = ranges
      .filter((r) => sectionNamePatterns.some((p) => p.test(r.title)))
      .map((r) => r.index);
    if (startIndexes.length === 0) return [];
    const start = startIndexes[0];
    let end = lines.length;
    for (const r of ranges) {
      if (r.index > start) {
        end = r.index;
        break;
      }
    }
    return lines.slice(start + 1, end).filter((l) => l.length > 0);
  }

  function getTextBeforeFirstSection() {
    const first = ranges[0];
    if (!first) return lines;
    return lines.slice(0, first.index);
  }

  const headerLines = getTextBeforeFirstSection();

  function isLikelySectionTitle(line) {
    const t = line.toLowerCase();
    return (
      /^(curr[ií]culo|resume|cv)$/i.test(t) ||
      t.length < 3 ||
      (t.length < 30 && /^(resumo|formação|experiência|habilidades|objetivo|educação|competências)$/i.test(t))
    );
  }

  function looksLikeContact(line) {
    return (
      line.includes("@") ||
      phoneRegex.test(line) ||
      line.includes("linkedin") ||
      line.includes("github") ||
      line.includes("http")
    );
  }

  const institutionLike = /universidade|instituto|federal|faculdade|campus|departamento|escola|col[eé]gio|utfpr|trabalho\s+de\s+conclus[aã]o|tcc|gradua[cç][aã]o|bacharelado|licenciatura/i;
  function looksLikeInstitution(line) {
    return institutionLike.test(line) && line.length > 35;
  }

  let nameLine = "";
  for (let i = 0; i < Math.min(headerLines.length, 15); i++) {
    const line = headerLines[i];
    if (isLikelySectionTitle(line)) continue;
    if (looksLikeContact(line)) continue;
    if (looksLikeInstitution(line)) continue;
    if (line.length >= 2 && line.length <= 70) {
      nameLine = line;
      break;
    }
  }
  if (!nameLine && headerLines.length > 0) {
    const first = headerLines.find(
      (l) =>
        l.length >= 2 &&
        l.length <= 70 &&
        !looksLikeContact(l) &&
        !looksLikeInstitution(l)
    );
    if (first) nameLine = first;
  }

  // Preferir "Resumo Profissional" / "Resumo" sobre "Objetivo"
  let summaryLines = getSectionContent([/^resumo\s*profissional$/i, /^resumo$/i, /^summary$/i]);
  if (summaryLines.length === 0) {
    summaryLines = getSectionContent([/^objetivo(s)?$/i, /^objective(s)?$/i]);
  }
  const summary = stripBullets(summaryLines.join(" ").trim()) || "";

  // Habilidades: incluir Cursos e qualificações + Informações adicionais
  const skillsFromHabilidades = getSectionContent([/^habilidades/i, /^skills$/i, /^compet[eê]ncias$/i]);
  const skillsFromCursos = getSectionContent([/^cursos?\s*(e|and)?\s*qualifica[cç][oõ]es?$/i, /^qualifica[cç][oõ]es?$/i]);
  const skillsFromInfo = getSectionContent([/^informa[cç][oõ]es?\s*adicionais?$/i]);
  const skillsLines = [...skillsFromHabilidades, ...skillsFromCursos, ...skillsFromInfo];
  const skills = parseSkillsBlock(skillsLines);

  const experienceLines = getSectionContent([
    /^experi[eê]ncia(s)?\s*(profissional(is)?)?$/i,
    /^experience(s)?$/i,
  ]);
  const workExperience = parseExperienceBlock(experienceLines);

  const educationLines = getSectionContent([
    /^forma[cç][aã]o(\s*acad[eê]mica)?$/i,
    /^education$/i,
  ]);
  const education = parseEducationBlock(educationLines);

  return {
    candidate: {
      name: stripBullets(nameLine || ""),
      summary: summary || "",
      email: emails[0] || "",
      phone: phones[0] || "",
      linkedin: linkedinUrl || "",
      github: githubUrl || "",
      website: websiteUrl || "",
    },
    workExperience,
    education,
    skills,
  };
}

function parseExperienceBlock(lines) {
  if (lines.length === 0) return [];
  const entries = [];
  const bulletRe = /^[•\-*▪●◦○◆\s\u2022\u2023\u2043]+/;
  let current = null;
  const dateInParens = /\(([^)]*)\)\s*$/;
  const dateRangeRe = /(\d{1,2})\/(\d{2,4})\s*-\s*(\d{1,2})\/(\d{2,4})/;
  const singleDateRe = /(\d{1,2})\/\s*(\d{2,4})|(\d{2,4})/;

  for (const rawLine of lines) {
    const line = stripBullets(rawLine).trim();
    if (!line) continue;
    const parenMatch = line.match(dateInParens);
    const hasDate = parenMatch && /\d/.test(parenMatch[1]);
    const looksLikeRole = hasDate && line.length < 120;

    if (looksLikeRole && (current === null || current.description.trim())) {
      if (current && (current.role || current.description)) entries.push(current);
      const rolePart = line.replace(dateInParens, "").trim();
      const dateStr = parenMatch ? parenMatch[1].trim() : "";
      let startDate = "";
      let endDate = "";
      let currentJob = false;
      const range = dateStr.match(dateRangeRe);
      if (range) {
        startDate = `${range[1].padStart(2, "0")}/${range[2]}`;
        endDate = `${range[3].padStart(2, "0")}/${range[4]}`;
      } else {
        const single = dateStr.match(/(\d{1,2})\/+\s*(\d{2,4})|(\d{4})/);
        if (single) {
          if (single[3]) {
            endDate = single[3];
            startDate = single[3];
          } else {
            startDate = `${String(single[1]).padStart(2, "0")}/${single[2]}`;
            endDate = startDate;
          }
        }
        if (/presente|atual|current|até o momento/i.test(dateStr)) currentJob = true;
      }
      current = { company: "", role: rolePart, startDate, endDate, current: currentJob, description: "" };
    } else if (current) {
      if (PAGE_BREAK_RE.test(line) || /^\s*\d+\s+of\s+\d+\s*$/i.test(line)) continue;
      current.description = (current.description + " " + line).trim();
    }
  }
  entries.forEach((e) => {
    e.description = (e.description || "").replace(PAGE_BREAK_RE, "").trim();
  });
  if (current && (current.role || current.description)) {
    current.description = (current.description || "").replace(PAGE_BREAK_RE, "").trim();
    entries.push(current);
  }
  return entries;
}

function parseEducationBlock(lines) {
  if (lines.length === 0) return [];
  const entries = [];
  const dateInParens = /\(([^)]*)\)\s*$/;
  const dashRe = /\s*[–\-]\s+/;

  for (const rawLine of lines) {
    const line = stripBullets(rawLine).trim();
    if (!line || line.length < 4) continue;
    const parenMatch = line.match(dateInParens);
    const afterParens = parenMatch ? line.replace(dateInParens, "").trim() : line;
    const parts = afterParens.split(dashRe);
    let degree = parts[0]?.trim() || "";
    let institution = parts[1]?.trim() || "";
    if (!institution && parts.length === 1) institution = "";
    const dateStr = parenMatch ? parenMatch[1].trim() : "";
    const yearMatch = dateStr.match(/(\d{4})/);
    const endYear = yearMatch ? yearMatch[1] : "";
    const startDate = endYear ? `01/${endYear}` : "";
    entries.push({
      institution,
      degree,
      field: "",
      startDate: "",
      endDate: endYear || dateStr || "",
    });
  }
  return entries;
}

function parseSkillsBlock(lines) {
  if (lines.length === 0) return [];
  const filtered = lines
    .map((l) => l.replace(PAGE_BREAK_RE, "").trim())
    .filter((l) => l.length > 0 && !/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/i.test(l) && !/^\s*\d+\s+of\s+\d+\s*$/i.test(l));
  const raw = filtered.map((l) => stripBullets(l.trim())).filter(Boolean);
  const skills = [];
  const splitRe = /[,;]|\s+\|\s+|\s+ e \s+|\s+ and \s+/i;
  for (const line of raw) {
    const parts = line.split(splitRe).map((s) => stripBullets(s).trim()).filter((s) => s.length > 0 && s.length < 80);
    for (const p of parts) if (!/^\s*\d+\s+of\s+\d+\s*$/i.test(p)) skills.push(p);
  }
  if (skills.length === 0 && raw.length > 0) {
    const oneLine = raw.join(" ");
    const byComma = oneLine.split(splitRe).map((s) => stripBullets(s).trim()).filter((s) => s.length > 0 && s.length < 80);
    if (byComma.length >= 1) return [...new Set(byComma)];
    return [oneLine.slice(0, 80)];
  }
  return [...new Set(skills)];
}

export { parseResumeText };
