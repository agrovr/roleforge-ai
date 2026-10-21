"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleForgeIcon } from "@/app/components/RoleForgeIcons";
import type { AdminSupportRequest } from "@/app/lib/supportAdmin";
import { supportStatusLabel } from "@/app/lib/supportRequests";
import { searchSupportQueue, supportQueueCounts, visibleSupportSelection, SUPPORT_REPLY_SNIPPETS, type QueueStatus } from "@/app/lib/supportQueue";
import type { SupportBulkResult, SupportBulkTarget } from "@/app/lib/supportBulk";
import { SupportSubmitButton } from "./SupportSubmitButton";

function SupportStatusForm({ request, status, label, icon, returnStatus, busy }: { request: AdminSupportRequest; status: "open" | "reviewing" | "closed"; label: string; icon: "check" | "mail" | "undo"; returnStatus: "open" | "reviewing" | "closed" | "all"; busy: boolean }) {
  const disabled = busy || request.status === status;
  return (
    <form action="/admin/support/actions" method="post">
      <input type="hidden" name="id" value={request.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="version" value={request.updatedAt} />
      <input type="hidden" name="returnStatus" value={returnStatus} />
      <SupportSubmitButton disabled={disabled} icon={icon} label={label} pendingLabel="Updating…" />
    </form>
  );
}



export function SupportQueue({ initialRequests, initialStatus, readiness, loadError, updateAction }: {
  initialRequests: AdminSupportRequest[]; initialStatus: QueueStatus; readiness: { customerReplyReady: boolean }; loadError: boolean;
  updateAction: (targets: SupportBulkTarget[], status: string) => Promise<SupportBulkResult>;
}) {
  const [source, setSource] = useState(initialRequests);
  const [requests, setRequests] = useState(initialRequests);
  const [status, setStatus] = useState(initialStatus);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [snippets, setSnippets] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const router = useRouter();
  if (source !== initialRequests) { setSource(initialRequests); setRequests(initialRequests); }
  const matching = useMemo(() => searchSupportQueue(requests, query), [requests, query]);
  const counts = supportQueueCounts(matching);
  const filtered = matching.filter((request) => status === "all" || request.status === status);
  const lastPage = Math.max(0, Math.ceil(filtered.length / 40) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = filtered.slice(currentPage * 40, currentPage * 40 + 40);
  const visibleSelected = visibleSupportSelection(selected, visible);
  if (visibleSelected.length !== selected.length) setSelected(visibleSelected);
  const selectedRequests = visible.filter((request) => visibleSelected.includes(request.id));
  const allSelected = visible.length > 0 && visibleSelected.length === visible.length;
  async function update(status: "open" | "reviewing" | "closed") {
    if (pending.current) return;
    const targets = selectedRequests.filter((request) => request.status !== status).map((request) => ({ id: request.id, version: request.updatedAt }));
    if (!targets.length) return;
    pending.current = true; setBusy(true); setNotice(""); setFailures([]);
    try {
      const result = await updateAction(targets, status);
      const saved = new Map(result.saved.map((row) => [row.id, row]));
      setRequests((previous) => previous.map((request) => saved.has(request.id) ? { ...request, ...saved.get(request.id)!, statusLabel: supportStatusLabel(saved.get(request.id)!.status) } : request));
      setSelected((previous) => previous.filter((id) => !saved.has(id)));
      setNotice(result.saved.length ? `${result.saved.length} ${result.saved.length === 1 ? "request moved" : "requests moved"} to ${supportStatusLabel(status)}.` : "No updates confirmed.");
      setFailures([...(result.error ? [result.error] : []), ...result.failed.map((item) => `${requests.find((request) => request.id === item.id)?.referenceLabel ?? "Request"}: ${item.error}`)]);
      if (result.saved.length) router.refresh();
    } catch { setFailures(["Could not confirm these updates. Refresh to check their current status before retrying."]); }
    finally { pending.current = false; setBusy(false); }
  }
  function insertSnippet(request: AdminSupportRequest, text: string) {
    if (drafts[request.id]?.trim() && !window.confirm("Replace this reply draft with the selected snippet?")) return;
    setDrafts((previous) => ({ ...previous, [request.id]: text }));
    setSnippets((previous) => ({ ...previous, [request.id]: true }));
    document.getElementById(`reply-${request.id}`)?.focus();
  }
  return <>
    <div className="admin-queue-search"><label htmlFor="admin-support-search">Search requests</label><input id="admin-support-search" type="search" value={query} disabled={busy} placeholder="Reference, subject, email, message, or category" onChange={(event) => { setQuery(event.target.value); setPage(0); }} /><span role="status">{counts.all} matching {counts.all === 1 ? "request" : "requests"}</span></div>
    <nav className="admin-support-filter" aria-label="Support request filters">{(["open", "reviewing", "closed", "all"] as const).map((item) => <button type="button" disabled={busy} className={status === item ? "active" : ""} key={item} aria-pressed={status === item} onClick={() => { setStatus(item); setPage(0); }}><span>{item === "all" ? "All" : supportStatusLabel(item)}</span><strong>{counts[item]}</strong></button>)}</nav>
    <div className="admin-bulk-bar" aria-busy={busy}>
      <label className="admin-select-all"><input type="checkbox" checked={allSelected} disabled={busy || !visible.length} onChange={() => setSelected(allSelected ? [] : visible.map((request) => request.id))} />Select all visible</label>
      <span>{visibleSelected.length} selected</span>
      {([['reviewing', 'Mark reviewing'], ['closed', 'Close'], ['open', 'Reopen']] as const).map(([value, label]) => <button type="button" key={value} disabled={busy || !selectedRequests.some((request) => request.status !== value)} onClick={() => void update(value)}>{busy ? "Updating…" : label}</button>)}
      <button type="button" disabled={busy} onClick={() => router.refresh()}>Refresh queue</button>
    </div>
    <p className="admin-support-notice" role="status">{notice}</p>
    {failures.length > 0 && <div className="admin-support-notice" role="alert">{failures.map((error) => <p key={error}>{error}</p>)}</div>}
    <p className="admin-queue-range">{filtered.length ? `${currentPage * 40 + 1}–${currentPage * 40 + visible.length} of ${filtered.length}` : "No matching requests in this view"}</p>
          <section className="admin-support-list" aria-label="Support request list">
        {visible.length ? visible.map((request) => {
          return (
            <article className="admin-support-card" data-status={request.status} aria-labelledby={`support-request-${request.id}`} key={request.id}>
              <header>
                <div className="admin-support-card-heading">
                  <label className="admin-case-select"><input type="checkbox" checked={visibleSelected.includes(request.id)} disabled={busy} onChange={() => setSelected((previous) => previous.includes(request.id) ? previous.filter((id) => id !== request.id) : [...previous, request.id])} aria-label={`Select ${request.referenceLabel}`} /></label>
                  <span className="admin-support-reference">{request.referenceLabel}</span>
                  <span className={`admin-support-status ${request.status}`}>{request.statusLabel}</span>
                </div>
                <div className="admin-support-card-copy">
                  <h2 id={`support-request-${request.id}`}>{request.subject}</h2>
                  <p>{request.categoryLabel} · {request.createdLabel}</p>
                </div>
              </header>
              <div className="admin-support-card-body">
                <div className="admin-support-case">
                  <span className="admin-support-panel-label">Customer request</span>
                  <p className="admin-support-message">{request.message}</p>
                  <dl className="admin-support-meta">
                    <div>
                      <dt>Customer</dt>
                      <dd>{request.email}</dd>
                    </div>
                    {request.contextUrl ? (
                      <div>
                        <dt>Context</dt>
                        <dd>{request.contextUrl}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="admin-support-next-step" aria-label="Recommended support workflow">
                    <RoleForgeIcon name={request.status === "closed" ? "check" : "sparkle"} size={15} />
                    <span>
                      {request.status === "closed"
                        ? "Resolved. Reopen only if the customer needs another pass."
                        : "Recommended: send a customer-safe reply, mark reviewing while you investigate, then close after the customer has an answer."}
                    </span>
                  </div>
                </div>

                <div className="admin-support-workbench">
                  <span className="admin-support-panel-label">Response workspace</span>
                  <form className="admin-support-reply-form" action="/admin/support/reply" method="post">
                    <input type="hidden" name="id" value={request.id} />
                    <input type="hidden" name="version" value={request.updatedAt} />
                    <input type="hidden" name="returnStatus" value={status} />
                    <label htmlFor={`reply-${request.id}`}>Customer-safe reply</label>
                    <div className="admin-reply-snippets" aria-label={`Reply snippets for ${request.referenceLabel}`}>
                      {SUPPORT_REPLY_SNIPPETS.map((snippet) => <button type="button" disabled={busy} key={snippet.id} className={snippet.categories.some((category) => category === request.category) ? "recommended" : ""} onClick={() => insertSnippet(request, snippet.text)}>{snippet.label}</button>)}
                    </div>
                    {snippets[request.id] && <small role="status">Snippet inserted. Edit before sending.</small>}
                    <textarea
                      id={`reply-${request.id}`}
                      name="message"
                      rows={5}
                      value={drafts[request.id] ?? ""}
                      onChange={(event) => setDrafts((previous) => ({ ...previous, [request.id]: event.target.value }))}
                      required
                      minLength={12}
                      maxLength={2000}
                      placeholder={`Hi,\n\nThanks for reaching out. I checked ${request.referenceLabel} and...`}
                      disabled={busy || !readiness.customerReplyReady || request.email === "No email"}
                    />
                    <div className="admin-support-reply-footer">
                      <span>
                        {readiness.customerReplyReady
                          ? "Sent from the configured support sender, not your private Gmail."
                          : "Customer replies are paused until a verified support sender is configured. Your private Gmail stays hidden."}
                      </span>
                      <div>
                        <SupportSubmitButton
                          className="admin-support-action primary"
                          name="nextStatus"
                          value="reviewing"
                          disabled={busy || !readiness.customerReplyReady || request.email === "No email"}
                          icon="mail"
                          label="Send reply"
                          pendingLabel="Sending…"
                        />
                        <SupportSubmitButton
                          name="nextStatus"
                          value="closed"
                          disabled={busy || !readiness.customerReplyReady || request.email === "No email"}
                          icon="check"
                          label="Send and close"
                          pendingLabel="Sending and closing…"
                        />
                      </div>
                    </div>
                  </form>
                  <div className="admin-support-actions">
                    <span className="admin-support-actions-label">Queue status</span>
                    <SupportStatusForm request={request} status="reviewing" label="Reviewing" icon="mail" returnStatus={status} busy={busy} />
                    <SupportStatusForm request={request} status="closed" label="Close" icon="check" returnStatus={status} busy={busy} />
                    {request.status === "closed" ? <SupportStatusForm request={request} status="open" label="Reopen" icon="undo" returnStatus={status} busy={busy} /> : null}
                  </div>
                </div>
              </div>
            </article>
          );
        }) : loadError ? (
          <article className="admin-support-empty is-error">
            <RoleForgeIcon name="settings" size={18} />
            <strong>Could not load this queue</strong>
            <p>Refresh the page or check the support database connection. Existing requests remain unchanged.</p>
          </article>
        ) : (
          <article className="admin-support-empty">
            <RoleForgeIcon name="check" size={18} />
            <strong>No support requests in this view</strong>
            <p>New requests will appear here after customers send them from the Support page.</p>
          </article>
        )}
      </section>
    {lastPage > 0 && <nav className="admin-queue-pagination" aria-label="Queue pages"><button disabled={busy || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage + 1} of {lastPage + 1}</span><button disabled={busy || currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button></nav>}
  </>;
}
