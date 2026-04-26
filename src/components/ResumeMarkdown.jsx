"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";

/** Remove cercas ``` se a IA as incluir por engano. */
function normalizeResumeMarkdown(raw) {
  let t = String(raw || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-z0-9]*\s*\n?/i, "").replace(/\n```\s*$/i, "").trim();
  }
  return t;
}

export function ResumeMarkdown({ children }) {
  const source = useMemo(() => normalizeResumeMarkdown(children), [children]);

  return (
    <div className="resume-markdown-content max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="mt-0 border-b border-slate-200 pb-2 text-lg font-bold tracking-tight text-slate-900"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="mt-6 border-b border-indigo-100 pb-2 text-sm font-bold uppercase tracking-wide text-indigo-950 first:mt-0"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mt-4 text-sm font-semibold text-slate-900" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="my-2 text-[15px] leading-relaxed text-slate-700" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="my-3 list-disc space-y-2 pl-6 text-slate-700 marker:text-indigo-600"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-3 list-decimal space-y-2 pl-6 text-slate-700 marker:font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-[15px] leading-relaxed text-slate-700 [&>p]:my-1">
              {props.children}
            </li>
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-slate-900" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="break-all text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          hr: () => <hr className="my-6 border-slate-200" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
