"use client";

import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";

const emptyCandidate = () => ({
  name: "",
  title: "",
  summary: "",
  location: "",
  email: "",
  phone: "",
  linkedin: "",
  github: "",
  website: "",
});

const emptyExperience = () => ({
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  current: false,
  description: "",
});

const emptyEducation = () => ({
  institution: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
const sectionTitleClass = "mb-4 text-base font-semibold text-slate-900";

export default function Home() {
  const [tab, setTab] = useState("gerar"); // "gerar" | "analisar"

  // Estado do fluxo "Gerar currículo"
  const [candidate, setCandidate] = useState(emptyCandidate());
  const [workExperience, setWorkExperience] = useState([emptyExperience()]);
  const [education, setEducation] = useState([emptyEducation()]);
  const [skillsText, setSkillsText] = useState("");
  const [languagesText, setLanguagesText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Estado do fluxo "Analisar currículo"
  const [analyzeResumeText, setAnalyzeResumeText] = useState("");
  const [analyzeJobDesc, setAnalyzeJobDesc] = useState("");
  const [analyzePdfLoading, setAnalyzePdfLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [analyzeResult, setAnalyzeResult] = useState(null);

  const resultRef = useRef(null);

  useEffect(() => {
    if ((result || analyzeResult) && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, analyzeResult]);

  function downloadResumePdf(text) {
    if (!text || !text.trim()) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lineHeight = 6;
    let y = margin;
    const paragraphs = text.split(/\n/);
    doc.setFontSize(11);
    for (const paragraph of paragraphs) {
      const lines = doc.splitTextToSize(paragraph || " ", maxWidth);
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
    }
    doc.save("curriculo.pdf");
  }

  const updateCandidate = (field, value) => {
    setCandidate((prev) => ({ ...prev, [field]: value }));
  };

  const updateExperience = (index, field, value) => {
    setWorkExperience((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  const addExperience = () => {
    setWorkExperience((prev) => [...prev, emptyExperience()]);
  };

  const removeExperience = (index) => {
    if (workExperience.length <= 1) return;
    setWorkExperience((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEducation = (index, field, value) => {
    setEducation((prev) =>
      prev.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu))
    );
  };

  const addEducation = () => {
    setEducation((prev) => [...prev, emptyEducation()]);
  };

  const removeEducation = (index) => {
    if (education.length <= 1) return;
    setEducation((prev) => prev.filter((_, i) => i !== index));
  };

  const skills = skillsText
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const languages = languagesText
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handlePdfUpload = async (e) => {
    const input = e.target;
    const file = input?.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setPdfError("Envie apenas arquivos PDF.");
      return;
    }
    setPdfError(null);
    setParsingPdf(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao ler o PDF.");
      setCandidate((prev) => ({
        ...prev,
        name: data.candidate?.name ?? prev.name,
        summary: data.candidate?.summary ?? prev.summary,
        email: data.candidate?.email ?? prev.email,
        phone: data.candidate?.phone ?? prev.phone,
        linkedin: data.candidate?.linkedin ?? prev.linkedin,
        github: data.candidate?.github ?? prev.github,
        website: data.candidate?.website ?? prev.website,
      }));
      const exp = Array.isArray(data.workExperience) && data.workExperience.length > 0
        ? data.workExperience.map((e) => ({ ...emptyExperience(), ...e }))
        : [emptyExperience()];
      const edu = Array.isArray(data.education) && data.education.length > 0
        ? data.education.map((e) => ({ ...emptyEducation(), ...e }))
        : [emptyEducation()];
      setWorkExperience(exp);
      setEducation(edu);
      const skillsArr = Array.isArray(data.skills) ? data.skills : [];
      setSkillsText(skillsArr.join(", "));
      const languagesArr = Array.isArray(data.languages) ? data.languages : [];
      setLanguagesText(languagesArr.join(", "));
    } catch (err) {
      setPdfError(err.message);
    } finally {
      setParsingPdf(false);
      input.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    const payload = {
      candidate,
      workExperience: workExperience.filter(
        (e) => e.company || e.role || e.description
      ),
      education: education.filter((e) => e.institution || e.degree),
      skills,
      languages,
      jobDescription: jobDescription.trim(),
    };
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar currículo");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePdf = async (e) => {
    const input = e.target;
    const file = input?.files?.[0];
    if (!file || file.type !== "application/pdf") {
      setAnalyzeError("Selecione um arquivo PDF.");
      return;
    }
    setAnalyzeError(null);
    setAnalyzePdfLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/parse-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao ler o PDF.");
      const text = [
        data.candidate?.name,
        data.candidate?.summary,
        ...(data.workExperience || []).map((e) => `${e.role} ${e.company} ${e.description}`).filter(Boolean),
        ...(data.education || []).map((e) => `${e.degree} ${e.institution}`).filter(Boolean),
        (data.skills || []).join(" "),
        (data.languages || []).join(" "),
      ].filter(Boolean).join("\n\n");
      setAnalyzeResumeText(text);
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzePdfLoading(false);
      input.value = "";
    }
  };

  const handleAnalyzeSubmit = async (e) => {
    e.preventDefault();
    setAnalyzeError(null);
    setAnalyzeResult(null);
    const text = analyzeResumeText.trim();
    const jd = analyzeJobDesc.trim();
    if (!text || !jd) {
      setAnalyzeError("Preencha o currículo e a descrição da vaga.");
      return;
    }
    setAnalyzeLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text, jobDescription: jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao analisar.");
      setAnalyzeResult(data);
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navegação */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-tight text-slate-900">
              CVForge
            </span>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 sm:line-clamp-none sm:max-w-xl sm:text-xs">
              Uma aplicação para criação de currículos personalizados com inteligência
              artificial
            </p>
          </div>
          <nav className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("gerar")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "gerar"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Gerar currículo
            </button>
            <button
              type="button"
              onClick={() => setTab("analisar")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "analisar"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Analisar currículo
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {tab === "gerar" && (
          <>
            <div className="mb-8">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Gerar currículo
              </h1>
              <p className="mt-1 text-slate-600">
                Preencha seus dados e a descrição da vaga para gerar um currículo
                personalizado e ver a análise ATS.
              </p>
            </div>

            <section className={`mb-8 ${cardClass}`}>
              <h2 className={sectionTitleClass}>Importar do PDF</h2>
              <p className="mb-4 text-sm text-slate-600">
                Envie um currículo em PDF para preencher automaticamente: nome completo, resumo, e-mail, telefone, LinkedIn, GitHub, website e habilidades. Os demais campos você preenche manualmente.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                  <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {parsingPdf ? "Processando…" : "Selecionar PDF"}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    disabled={parsingPdf}
                    className="sr-only"
                  />
                </label>
                <span className="text-xs text-slate-500">Apenas PDF.</span>
              </div>
              {pdfError && <p className="mt-3 text-sm text-red-600">{pdfError}</p>}
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Dados do candidato</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Nome *</label>
                    <input type="text" value={candidate.name} onChange={(e) => updateCandidate("name", e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Título profissional</label>
                    <input type="text" value={candidate.title} onChange={(e) => updateCandidate("title", e.target.value)} placeholder="Ex: Desenvolvedor Full Stack" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Resumo / Objetivo</label>
                    <textarea value={candidate.summary} onChange={(e) => updateCandidate("summary", e.target.value)} rows={3} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Cidade</label>
                    <input type="text" value={candidate.location} onChange={(e) => updateCandidate("location", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input type="email" value={candidate.email} onChange={(e) => updateCandidate("email", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input type="text" value={candidate.phone} onChange={(e) => updateCandidate("phone", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>LinkedIn</label>
                    <input type="url" value={candidate.linkedin} onChange={(e) => updateCandidate("linkedin", e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div>
                    <label className={labelClass}>GitHub</label>
                    <input type="url" value={candidate.github} onChange={(e) => updateCandidate("github", e.target.value)} className={inputClass} placeholder="https://github.com/..." />
                  </div>
                  <div>
                    <label className={labelClass}>Website</label>
                    <input type="url" value={candidate.website} onChange={(e) => updateCandidate("website", e.target.value)} className={inputClass} placeholder="https://..." />
                  </div>
                </div>
              </section>

              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Experiência profissional</h2>
                <div className="space-y-5">
                  {workExperience.map((exp, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">Experiência {index + 1}</span>
                        {workExperience.length > 1 && (
                          <button type="button" onClick={() => removeExperience(index)} className="btn-danger">Remover</button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="text" placeholder="Empresa" value={exp.company} onChange={(e) => updateExperience(index, "company", e.target.value)} className={inputClass} />
                        <input type="text" placeholder="Cargo" value={exp.role} onChange={(e) => updateExperience(index, "role", e.target.value)} className={inputClass} />
                        <input type="text" placeholder="Data início (ex: 2020)" value={exp.startDate} onChange={(e) => updateExperience(index, "startDate", e.target.value)} className={inputClass} />
                        <div className="flex flex-wrap items-center gap-2">
                          <input type="text" placeholder="Data fim" value={exp.endDate} onChange={(e) => updateExperience(index, "endDate", e.target.value)} disabled={exp.current} className={`flex-1 min-w-0 ${inputClass}`} />
                          <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={exp.current} onChange={(e) => updateExperience(index, "current", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            Atual
                          </label>
                        </div>
                      </div>
                      <textarea placeholder="Descrição das atividades" value={exp.description} onChange={(e) => updateExperience(index, "description", e.target.value)} rows={3} className={`mt-3 ${inputClass}`} />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addExperience} className="btn-ghost mt-2">+ Adicionar experiência</button>
              </section>

              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Formação</h2>
                <div className="space-y-5">
                  {education.map((edu, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">Formação {index + 1}</span>
                        {education.length > 1 && <button type="button" onClick={() => removeEducation(index)} className="btn-danger">Remover</button>}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Instituição</label>
                          <input type="text" placeholder="Ex: UTFPR" value={edu.institution} onChange={(e) => updateEducation(index, "institution", e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Curso / Grau</label>
                          <input type="text" placeholder="Ex: Bacharelado em Ciência da Computação" value={edu.degree} onChange={(e) => updateEducation(index, "degree", e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Área (opcional)</label>
                          <input type="text" placeholder="Ex: Ciência da Computação" value={edu.field} onChange={(e) => updateEducation(index, "field", e.target.value)} className={inputClass} />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 min-w-0">
                            <label className={labelClass}>Início</label>
                            <input type="text" placeholder="Ex: 2018" value={edu.startDate} onChange={(e) => updateEducation(index, "startDate", e.target.value)} className={inputClass} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className={labelClass}>Fim</label>
                            <input type="text" placeholder="Ex: 2022" value={edu.endDate} onChange={(e) => updateEducation(index, "endDate", e.target.value)} className={inputClass} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addEducation} className="btn-ghost mt-2">+ Adicionar formação</button>
              </section>

              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Habilidades</h2>
                <label className={labelClass}>Separe por vírgula ou ponto e vírgula</label>
                <textarea value={skillsText} onChange={(e) => setSkillsText(e.target.value)} rows={2} placeholder="JavaScript, React, Node.js..." className={inputClass} />
              </section>

              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Idiomas</h2>
                <label className={labelClass}>Separe por vírgula ou ponto e vírgula (ex.: Português nativo, Inglês avançado)</label>
                <textarea value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} rows={2} placeholder="Português nativo, Inglês avançado..." className={inputClass} />
              </section>

              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Descrição da vaga *</h2>
                <label className={labelClass}>Cole o texto completo da vaga.</label>
                <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={6} required placeholder="Ex: Desenvolvedor Full Stack..." className={inputClass} />
              </section>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? "Gerando…" : "Gerar currículo e análise ATS"}
                </button>
              </div>
            </form>

            {result && (
              <section ref={resultRef} className="resume-result mt-12 scroll-mt-8 space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Resultado</h2>
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                  <div className="min-w-0 flex-1 lg:min-w-[50%]">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-700">Currículo gerado</h3>
                      <button
                        type="button"
                        onClick={() => downloadResumePdf(result.text)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Download PDF
                      </button>
                    </div>
                    <pre>{result.text}</pre>
                  </div>
                  <div className="flex shrink-0 flex-col gap-4 lg:w-[300px]">
                    <h3 className="text-sm font-semibold text-slate-700">Análise ATS</h3>
                    <AnalysisBlock analysis={result.analysis} />
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {tab === "analisar" && (
          <>
            <div className="mb-8">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Analisar currículo
              </h1>
              <p className="mt-1 text-slate-600">
                Envie um currículo (PDF ou texto) e a descrição da vaga para
                obter a pontuação ATS e sugestões de melhoria.
              </p>
            </div>

            <form onSubmit={handleAnalyzeSubmit} className="space-y-6">
              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Currículo</h2>
                <p className="mb-3 text-sm text-slate-600">
                  Envie um PDF ou cole o texto do currículo abaixo.
                </p>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                    <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {analyzePdfLoading ? "Processando…" : "Enviar PDF"}
                    <input type="file" accept=".pdf,application/pdf" onChange={handleAnalyzePdf} disabled={analyzePdfLoading} className="sr-only" />
                  </label>
                </div>
                <label className={labelClass}>Texto do currículo</label>
                <textarea
                  value={analyzeResumeText}
                  onChange={(e) => setAnalyzeResumeText(e.target.value)}
                  rows={8}
                  placeholder="Cole aqui o texto do currículo ou use o botão acima para importar de um PDF."
                  className={inputClass}
                />
              </section>

              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Descrição da vaga *</h2>
                <label className={labelClass}>Cole o texto completo da vaga.</label>
                <textarea
                  value={analyzeJobDesc}
                  onChange={(e) => setAnalyzeJobDesc(e.target.value)}
                  rows={5}
                  required
                  placeholder="Ex: Desenvolvedor Full Stack..."
                  className={inputClass}
                />
              </section>

              {analyzeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{analyzeError}</div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={analyzeLoading || !analyzeResumeText.trim() || !analyzeJobDesc.trim()}
                  className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {analyzeLoading ? "Analisando…" : "Analisar currículo"}
                </button>
              </div>
            </form>

            {analyzeResult && (
              <section ref={resultRef} className="mt-12 scroll-mt-8 space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Resultado da análise</h2>
                <div className="max-w-md">
                  <AnalysisBlock analysis={analyzeResult.analysis} />
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-16 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          CVForge: Uma aplicação para criação de currículos personalizados com inteligência
          artificial · Next.js e Tailwind CSS
        </footer>
      </main>
    </div>
  );
}

function AnalysisBlock({ analysis }) {
  if (!analysis) return null;
  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">Pontuação geral</span>
          <span
            className={`text-2xl font-bold tabular-nums ${
              analysis.atsScore >= 70
                ? "text-emerald-600"
                : analysis.atsScore >= 50
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {analysis.atsScore}
          </span>
        </div>
        <ul className="space-y-2.5 text-sm">
          {[
            ["Palavras-chave", analysis.keywordMatch],
            ["Habilidades", analysis.skillsMatch],
            ["Experiência", analysis.experienceScore],
            ["Similaridade", analysis.semanticSimilarity],
            ["Formatação", analysis.formattingScore],
          ].map(([label, value]) => (
            <li key={label} className="flex justify-between text-slate-600">
              <span>{label}</span>
              <span className="font-medium tabular-nums text-slate-900">{value}%</span>
            </li>
          ))}
        </ul>
      </div>
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Sugestões de melhoria</h4>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {analysis.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
