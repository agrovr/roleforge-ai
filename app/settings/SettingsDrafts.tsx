"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ResumePreview } from "../components/ResumePreview";
import { APPLICATION_STATUS_OPTIONS } from "../lib/applicationStatus";
import { RESUME_TEMPLATES, getResumeTemplate, resumeTemplateStudioHref } from "../lib/resumeTemplates";
import { settingsChanges, type SettingsField, type SettingsValue, type SettingsChange, type SettingsSaveResult } from "../lib/settingsDrafts";

type DraftContext = {
  baseline: Record<string, SettingsValue>; draft: Record<string, SettingsValue>;
  busy: boolean; errors: Record<string, string>;
  change: (key: string, value: SettingsValue) => void;
  save: (keys: string[]) => void;
};
const Context = createContext<DraftContext | null>(null);
function useDraft() {
  const value = useContext(Context);
  if (!value) throw new Error("Settings fields require a draft provider.");
  return value;
}
function valueLabel(key: string, value: SettingsValue) {
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (key === "template") return getResumeTemplate(value).name;
  if (key.endsWith(":status")) return APPLICATION_STATUS_OPTIONS.find((option) => option.status === value)?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
  return value || "Not set";
}

export function SettingsDraftProvider({ fields, saveAction, children }: {
  fields: SettingsField[]; saveAction: (changes: SettingsChange[]) => Promise<SettingsSaveResult>; children: ReactNode;
}) {
  const [baseline, setBaseline] = useState(() => Object.fromEntries(fields.map((field) => [field.key, field.value])));
  const [draft, setDraft] = useState(baseline);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const changes = settingsChanges(baseline, draft);
  const dirty = changes.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const guardLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, location.href);
      if (target.pathname === "/api/account/export" || (target.origin === location.origin && target.pathname === location.pathname && target.search === location.search)) return;
      if (!window.confirm("Leave settings and discard unsaved changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardLink, true); };
  }, [dirty]);
  function change(key: string, value: SettingsValue) {
    if (saving.current) return;
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => { const next = { ...previous }; delete next[key]; return next; });
    setNotice("");
  }
  async function save(keys: string[]) {
    if (saving.current) return;
    const submitted = changes.filter((change) => keys.includes(change.key));
    if (!submitted.length) return;
    saving.current = true; setBusy(true); setNotice("");
    try {
      const result = await saveAction(submitted);
      const saved = Object.fromEntries(result.saved.map((change) => [change.key, change.value]));
      setBaseline((previous) => ({ ...previous, ...saved }));
      setDraft((previous) => ({ ...previous, ...saved }));
      setErrors((previous) => {
        const next = { ...previous }; delete next.form;
        for (const change of submitted) delete next[change.key];
        return { ...next, ...result.errors };
      });
      if (result.saved.length) {
        setNotice(`${result.saved.length} ${result.saved.length === 1 ? "change" : "changes"} saved at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.${Object.keys(result.errors).length ? " Other changes still need attention." : ""}`);
        router.refresh();
      }
    } catch {
      setErrors((previous) => ({ ...previous, form: "Could not confirm the save. Some changes may have been saved. Your draft is retained; retry to confirm." }));
    } finally { saving.current = false; setBusy(false); }
  }
  return <Context.Provider value={{ baseline, draft, busy, errors, change, save }}><div className="rf-settings-page">
    {children}
    <aside className={`settings-save-bar${dirty || Object.keys(errors).length ? " has-changes" : ""}`} aria-label="Settings changes" aria-busy={busy}>
      <div role="status" aria-live="polite">{busy ? "Saving changes…" : notice || (dirty ? `${changes.length} unsaved ${changes.length === 1 ? "change" : "changes"}` : "No unsaved changes")}</div>
      {Object.keys(errors).length > 0 && <div role="alert">{Object.entries(errors).map(([key, error]) => <p key={key}>{fields.find((field) => field.key === key)?.label ?? "Save"}: {error}</p>)}</div>}
      {dirty && <>
        <ul>{changes.map(({ key, value }) => <li key={key}><span><strong>{fields.find((field) => field.key === key)?.label ?? key}</strong>: {valueLabel(key, baseline[key])} → {valueLabel(key, value)}</span><button type="button" disabled={busy} onClick={() => change(key, baseline[key])} aria-label={`Undo ${fields.find((field) => field.key === key)?.label ?? key}`}>Undo</button></li>)}</ul>
        <div className="settings-save-actions"><button className="ghost-button" disabled={busy} onClick={() => { setDraft(baseline); setErrors({}); setNotice("Unsaved changes discarded."); }}>Discard all</button><button className="primary-button" disabled={busy} onClick={() => void save(changes.map((change) => change.key))}>{busy ? "Saving…" : "Save changes"}</button></div>
      </>}
    </aside>
  </div></Context.Provider>;
}

export function SettingsDraftField({ fieldKey, label, saveLabel, kind = "text", maxLength, hint }: {
  fieldKey: string; label: string; saveLabel: string; kind?: "text" | "checkbox" | "status"; maxLength?: number; hint?: string;
}) {
  const { baseline, draft, busy, errors, change, save } = useDraft();
  const changed = baseline[fieldKey] !== draft[fieldKey];
  const id = `settings-draft-${fieldKey.replaceAll(":", "-")}`;
  const description = [hint ? `${id}-hint` : "", errors[fieldKey] ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <form className={`settings-profile-form settings-draft-field${changed ? " is-changed" : ""}`} onSubmit={(event) => { event.preventDefault(); save([fieldKey]); }}>
    <label htmlFor={id}>{label}</label>
    <div className="settings-profile-edit-row">
      {kind === "checkbox" ? <input id={id} type="checkbox" checked={draft[fieldKey] === true} disabled={busy} onChange={(event) => change(fieldKey, event.target.checked)} aria-describedby={description} aria-invalid={Boolean(errors[fieldKey])} />
        : kind === "status" ? <select id={id} value={String(draft[fieldKey])} disabled={busy} onChange={(event) => change(fieldKey, event.target.value)} aria-describedby={description} aria-invalid={Boolean(errors[fieldKey])}>{!APPLICATION_STATUS_OPTIONS.some((option) => option.status === draft[fieldKey]) && <option value={String(draft[fieldKey])}>{String(draft[fieldKey])}</option>}{APPLICATION_STATUS_OPTIONS.map((option) => <option key={option.status} value={option.status}>{option.label}</option>)}</select>
        : <input id={id} type="text" autoComplete={fieldKey === "displayName" ? "name" : "off"} value={String(draft[fieldKey] ?? "")} maxLength={maxLength} required={fieldKey.endsWith(":title")} disabled={busy} onChange={(event) => change(fieldKey, event.target.value)} aria-invalid={Boolean(errors[fieldKey])} aria-describedby={description} />}
      <button className="primary-button" type="submit" disabled={busy || !changed}>{busy ? "Saving…" : saveLabel}</button>
    </div>
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {errors[fieldKey] && <small id={`${id}-error`}>{errors[fieldKey]}</small>}
  </form>;
}

export function SettingsDraftProject({ projectId, children }: { projectId: string; children: ReactNode }) {
  const { baseline, draft } = useDraft();
  const changed = ["title", "status"].some((field) => baseline[`project:${projectId}:${field}`] !== draft[`project:${projectId}:${field}`]);
  return <article className={`settings-project-item${changed ? " is-changed" : ""}`}>{children}</article>;
}

export function SettingsDraftTemplates() {
  const { baseline, draft, busy, change, save } = useDraft();
  const selectedTemplate = getResumeTemplate(String(draft.template));
  return <>
    <div className="settings-template-grid" aria-label="Default resume direction">{RESUME_TEMPLATES.map((template) => {
      const selected = template.slug === draft.template;
      return <article className={`settings-template-card${selected ? " selected" : ""}`} key={template.slug}>
        <div className="settings-template-thumb"><ResumePreview variant={template.variant} name={template.previewName} role={template.previewRole} highlight={selected} /></div>
        <div className="settings-template-card-copy"><div className="template-title-row"><span className="template-name">{template.name}</span><span className="template-tag">{template.tag}</span></div><p>{template.detail}</p><button type="button" disabled={busy} aria-pressed={selected} className="btn btn-soft btn-sm settings-template-button" onClick={() => change("template", template.slug)}>{selected ? "Selected" : "Choose direction"}</button></div>
      </article>;
    })}</div>
    <div className="settings-export-actions"><span>{selectedTemplate.name}{baseline.template !== draft.template ? " selected — unsaved." : " saved for this browser."}</span><button className="primary-button" disabled={busy || baseline.template === draft.template} onClick={() => save(["template"])}>Save direction</button><a className="ghost-button" href={resumeTemplateStudioHref(String(baseline.template))}>Open saved direction in studio</a></div>
  </>;
}
