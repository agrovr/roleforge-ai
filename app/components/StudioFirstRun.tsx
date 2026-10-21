"use client";

import Link from "next/link";
import { useState } from "react";
import { ResumePreview } from "./ResumePreview";
import { getResumeTemplate, type ResumeTemplateSlug } from "../lib/resumeTemplates";
import { validateResumeUpload } from "../lib/resumeUpload";

export function PasteResumeInput({ maxBytes, onUse }: { maxBytes: number; onUse: (file: File) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  return <details className="studio-paste-resume"><summary>Paste resume text instead</summary>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!text.trim()) { setError("Paste your resume text first."); return; }
      const file = new File([text.trim()], "Pasted resume.txt", { type: "text/plain" });
      const validation = validateResumeUpload(file, { maxBytes, allowedFormats: ["txt"] });
      if (!validation.valid) { setError(validation.message); return; }
      setError(""); onUse(file);
    }}>
      <label htmlFor="pastedResumeText">Resume text</label>
      <textarea id="pastedResumeText" value={text} onChange={(event) => { setText(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "pastedResumeHint pastedResumeError" : "pastedResumeHint"} rows={7} />
      <p id="pastedResumeHint">Your text will be read as a TXT resume using the same upload checks.</p>
      {error && <p id="pastedResumeError" role="alert">{error}</p>}
      <button className="primary-button" type="submit">Use this resume text</button>
    </form>
  </details>;
}

export function StudioFirstRunGuide({ selected, onSelect }: { selected: ResumeTemplateSlug; onSelect: (slug: ResumeTemplateSlug) => void }) {
  return <div className="studio-first-guide">
    <section aria-labelledby="studio-next-title"><span className="eyebrow">What happens next</span><h2 id="studio-next-title">Four steps, then your application kit</h2>
      <ol className="studio-first-steps">{[
        ["Upload", "Start with the experience already in your resume."],
        ["Target", "Add the role description or job posting URL."],
        ["Review", "Check the suggested wording and generated materials."],
        ["Export", "Choose an available format and download your resume."],
      ].map(([title, detail], index) => <li key={title}><span>{index + 1}</span><strong>{title}</strong><p>{detail}</p></li>)}</ol>
    </section>
    <section aria-labelledby="studio-template-title"><div className="studio-first-heading"><div><span className="eyebrow">Optional · example layouts</span><h2 id="studio-template-title">Pick a direction now, or later</h2></div><Link href="/templates" prefetch={false}>View all templates →</Link></div>
      <div className="studio-first-templates">{(["classic", "modern", "engineer"] as ResumeTemplateSlug[]).map((slug) => {
        const template = getResumeTemplate(slug);
        return <button key={slug} type="button" aria-pressed={selected === slug} onClick={() => onSelect(slug)}><div className="studio-first-template-preview" aria-hidden="true"><ResumePreview variant={template.variant} /></div><strong>{template.name}</strong><small>{template.tag}</small></button>;
      })}</div>
    </section>
    <p className="studio-first-note">Review suggestions for accuracy before you export. RoleForge does not submit applications for you.</p>
  </div>;
}
