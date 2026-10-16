"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { SUPPORT_REQUEST_CATEGORIES, supportCategoryLabel, supportRequestFieldErrors, type SupportRequestPrefill } from "../lib/supportRequests";

export function SupportForm({ prefill }: { prefill: SupportRequestPrefill }) {
  const [values, setValues] = useState({ category: prefill.category as string, subject: prefill.subject, message: "", contextUrl: prefill.contextUrl ?? "" });
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const prefillKey = JSON.stringify([prefill.category, prefill.subject, prefill.contextUrl]);
  const [source, setSource] = useState(prefillKey);
  if (source !== prefillKey) {
    setSource(prefillKey);
    setValues((previous) => ({ ...previous, category: prefill.category, subject: prefill.subject, contextUrl: prefill.contextUrl ?? "" }));
    setChecked(false);
  }
  const errors = checked ? supportRequestFieldErrors(values) : {};
  const count = Object.keys(errors).length;
  function update(field: keyof typeof values, value: string) { setValues((previous) => ({ ...previous, [field]: value })); }
  return <form className="support-form" action="/api/support-requests" method="post" noValidate aria-busy={pending} onSubmit={(event) => {
    if (pending) { event.preventDefault(); return; }
    const nextErrors = supportRequestFieldErrors(values);
    setChecked(true);
    if (Object.keys(nextErrors).length) {
      event.preventDefault();
      event.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }
    flushSync(() => setPending(true));
  }}>
    <label htmlFor="support-category">Topic</label>
    <select id="support-category" name="category" required value={values.category} onChange={(event) => update("category", event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "support-category-error" : undefined}>
      {SUPPORT_REQUEST_CATEGORIES.map((category) => <option key={category} value={category}>{supportCategoryLabel(category)}</option>)}
    </select>
    {errors.category && <p className="support-field-error" id="support-category-error" role="alert">{errors.category}</p>}
    <label htmlFor="support-subject">Subject</label>
    <input id="support-subject" name="subject" minLength={4} maxLength={120} required value={values.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Export download is not updating" aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? "support-subject-error" : undefined} />
    {errors.subject && <p className="support-field-error" id="support-subject-error" role="alert">{errors.subject}</p>}
    <label htmlFor="support-context">Related page or request id</label>
    <input id="support-context" name="contextUrl" maxLength={300} value={values.contextUrl} onChange={(event) => update("contextUrl", event.target.value)} placeholder="/settings#billing or req_..." aria-describedby="support-context-hint" />
    <small id="support-context-hint">Optional. Use a page path, web address, or request id.</small>
    <label htmlFor="support-message">Message</label>
    <textarea id="support-message" name="message" minLength={20} maxLength={2000} required rows={7} value={values.message} onChange={(event) => update("message", event.target.value)} placeholder="What happened, what you expected, and the last step you tried." aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "support-message-hint support-message-error" : "support-message-hint"} />
    <small id="support-message-hint">{values.message.length}/2000 characters. Include at least 20 characters.</small>
    {errors.message && <p className="support-field-error" id="support-message-error" role="alert">{errors.message}</p>}
    <button className="primary-button support-submit" type="submit" disabled={pending}>{pending ? "Sending request…" : count ? `Fix ${count} ${count === 1 ? "field" : "fields"} to send` : "Send request"}<RoleForgeIcon name="mail" size={14} /></button>
    <span role="status" aria-live="polite">{pending ? "Sending your support request…" : ""}</span>
  </form>;
}
