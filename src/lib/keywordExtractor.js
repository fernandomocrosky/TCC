const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "by",
  "is",
  "are",
  "as",
  "at",
  "be",
  "or",
  "from",
  "this",
  "that",
]);

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(text) {
  const normalized = normalize(text);
  const tokens = normalized.split(" ");
  const freq = new Map();

  for (const token of tokens) {
    if (!token || STOP_WORDS.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

function extractRequiredSkillsFromJobDescription(jobDescription, candidateSkills) {
  const jdKeywords = new Set(extractKeywords(jobDescription));
  const requiredSkills = [];

  for (const skill of candidateSkills || []) {
    const normalizedSkill = normalize(skill);
    const parts = normalizedSkill.split(" ");
    let matched = false;

    for (const part of parts) {
      if (jdKeywords.has(part)) {
        matched = true;
        break;
      }
    }

    if (matched) {
      requiredSkills.push(skill);
    }
  }

  return requiredSkills;
}

function buildResumeTextFromInput(input) {
  const sections = [];

  const candidate = input.candidate || {};
  const workExperience = input.workExperience || [];
  const education = input.education || [];
  const skills = input.skills || [];
  const languages = input.languages || [];

  sections.push(
    `${candidate.name || ""}${candidate.title ? " - " + candidate.title : ""}`.trim()
  );

  const contacts = [];
  if (candidate.location) contacts.push(candidate.location);
  if (candidate.email) contacts.push(candidate.email);
  if (candidate.phone) contacts.push(candidate.phone);
  if (candidate.linkedin) contacts.push(`LinkedIn: ${candidate.linkedin}`);
  if (candidate.github) contacts.push(`GitHub: ${candidate.github}`);
  if (candidate.website) contacts.push(`Website: ${candidate.website}`);
  if (contacts.length) sections.push(contacts.join(" | "));

  if (candidate.summary) {
    sections.push("");
    sections.push("SUMMARY");
    sections.push(candidate.summary);
  }

  if (workExperience.length) {
    sections.push("");
    sections.push("EXPERIENCE");
    for (const exp of workExperience) {
      const dateRange = `${exp.startDate || ""} - ${
        exp.current ? "Present" : exp.endDate || ""
      }`.trim();
      sections.push(`${exp.role} - ${exp.company} (${dateRange})`);
      sections.push(exp.description || "");
      sections.push("");
    }
  }

  if (education.length) {
    sections.push("");
    sections.push("EDUCATION");
    for (const edu of education) {
      const dateRange =
        edu.startDate || edu.endDate
          ? `${edu.startDate || ""} - ${edu.endDate || ""}`.trim()
          : "";
      sections.push(
        `${edu.degree || ""}${edu.field ? " - " + edu.field : ""} | ${
          edu.institution || ""
        }${dateRange ? " (" + dateRange + ")" : ""}`
      );
    }
  }

  if (skills.length) {
    sections.push("");
    sections.push("SKILLS");
    sections.push(skills.join(", "));
  }

  if (languages.length) {
    sections.push("");
    sections.push("IDIOMAS");
    sections.push(languages.join(", "));
  }

  return sections.join("\n");
}

export {
  normalize,
  extractKeywords,
  extractRequiredSkillsFromJobDescription,
  buildResumeTextFromInput,
};

