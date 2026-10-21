"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { applicationStatusCopy } from "../lib/applicationStatus";
import { PROJECT_FILTERS, latestProjects, matchesProjectFilter, projectDate, projectResumeText, type ProjectFilter } from "../lib/projectHome";
import { savedRunHistoryHref } from "../lib/savedRunLinks";
import type { SavedHistoryItem, SavedRunsPage } from "../lib/supabase/savedProjects";
import { updateSavedProjectStatus } from "../lib/supabase/savedProjectClient";
import { usageProgressPercent, type AccountUsage } from "../lib/usage";

function ResumeExcerpt({ run }: { run: SavedHistoryItem }) {
  const text = projectResumeText(run);
  return <div className="home-resume" aria-hidden="true">{text ? <pre>{text.slice(0, 1800)}</pre> : <span>Resume preview unavailable<br />Open the saved run to view its files.</span>}</div>;
}

export function ProjectHome({ name, initialPage, usage }: { name: string; initialPage: SavedRunsPage | null; usage: AccountUsage | null }) {
  const [runs, setRuns] = useState(initialPage?.runs ?? []);
  const [nextOffset, setNextOffset] = useState(initialPage?.nextOffset ?? (initialPage ? null : 0));
  const [filter, setFilter] = useState<ProjectFilter>("All");
  const [loading, setLoading] = useState(false);
  const [pendingProject, setPendingProject] = useState<string | null>(null);
  const [error, setError] = useState(initialPage ? "" : "Your projects could not be loaded. Try again.");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const filters = useRef<HTMLDivElement>(null);
  const projects = latestProjects(runs);
  const visible = projects.filter((run) => matchesProjectFilter(run, filter));
  const latest = projects.find((run) => run.applicationStatus !== "archived");

  async function loadMore() {
    if (busy.current || nextOffset === null) return;
    busy.current = true; setLoading(true); setError("");
    try {
      const response = await fetch(`/api/saved-runs?offset=${nextOffset}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to load your projects." : "Projects could not be loaded. Try again.");
      const page = await response.json() as SavedRunsPage;
      setRuns((current) => [...new Map([...current, ...page.runs].map((run) => [run.accountRunId || run.id, run])).values()]);
      setNextOffset(page.nextOffset);
      setNotice(page.nextOffset === null ? "All saved runs loaded." : "More saved runs loaded.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Projects could not be loaded."); }
    finally { busy.current = false; setLoading(false); }
  }

  async function archive(run: SavedHistoryItem) {
    if (!run.projectId || busy.current) return;
    busy.current = true; setPendingProject(run.projectId); setError("");
    const status = run.applicationStatus === "archived" ? "tailored" : "archived";
    try {
      const savedStatus = await updateSavedProjectStatus(run.projectId, status);
      setRuns((current) => current.map((item) => item.projectId === run.projectId ? { ...item, applicationStatus: savedStatus } : item));
      setNotice(`${run.projectTitle || "Project"} ${status === "archived" ? "archived" : "moved to Tailored"}.`);
      if (filter !== "All") filters.current?.querySelector<HTMLButtonElement>(`button[aria-pressed="true"]`)?.focus();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Project could not be updated."); }
    finally { busy.current = false; setPendingProject(null); }
  }

  return <main className="home-page">
    <a className="site-skip-link" href="#workspace">Skip to projects</a>
    <div className="home-content">
      <SiteHeader active="projects" signedIn studioHref="/app"><Link className="home-account" href="/settings" prefetch={false}>My account</Link></SiteHeader>
      <section className="home-greeting" id="workspace" tabIndex={-1}>
        <div><span className="home-eyebrow">Your workspace</span><h1>{name ? `Welcome back, ${name.split(" ")[0]}.` : "Welcome to your workspace."}</h1><p>Pick up a saved project, or shape your resume for the next opportunity.</p></div>
        <aside className="home-usage" aria-label="Monthly run usage"><span className="home-eyebrow">This month</span>
          {usage ? <><p><strong>{usage.monthlyRuns}</strong> {usage.monthlyRunLimit === null ? `${usage.monthlyRuns === 1 ? "run" : "runs"} · unlimited` : `of ${usage.monthlyRunLimit} runs used`}</p>
            {usage.monthlyRunLimit !== null && <progress aria-label="Monthly runs used" max={100} value={usageProgressPercent(usage)} />}
            <small>{usage.runLimited ? "Monthly limit reached. Your saved projects are still available." : "Completed tailoring runs this calendar month."}</small></> : <p>Usage is temporarily unavailable.</p>}
          <Link href="/settings#billing" prefetch={false}>View plan and usage →</Link>
        </aside>
      </section>
      {latest && <section className="home-continue" aria-labelledby="continue-title">
        <div className="home-section-heading"><div><span className="home-eyebrow">Pick up where you left off</span><h2 id="continue-title">{latest.projectTitle || latest.filename}</h2></div><span className="home-status">{applicationStatusCopy(latest.applicationStatus).label}</span></div>
        <div className="home-continue-body"><ResumeExcerpt run={latest} /><div className="home-continue-details"><p>Your latest saved version is ready to open in Studio.</p><dl><div><dt>Source resume</dt><dd>{latest.filename}</dd></div><div><dt>Saved</dt><dd>{projectDate(latest.createdAt)}</dd></div><div><dt>Template</dt><dd>{typeof latest.snapshot?.templateName === "string" ? latest.snapshot.templateName : "Saved template"}</dd></div></dl>
          <ol><li>Open your saved resume and target.</li><li>Review the wording for accuracy.</li><li>Choose your format and verify the export in Studio.</li></ol>
          <div className="home-actions"><Link className="home-button home-primary" href={savedRunHistoryHref(latest, { restore: Boolean(projectResumeText(latest)) })} prefetch={false}>Continue in Studio →</Link><Link className="home-button" href="/settings#projects" prefetch={false}>Manage projects</Link></div>
        </div></div>
      </section>}
      <section aria-labelledby="start-title"><div className="home-section-heading"><h2 id="start-title">Start something new</h2><span>One opportunity at a time.</span></div>
        <div className="home-start-grid"><Link href="/app" prefetch={false}><span className="home-eyebrow">01 · Upload</span><h3>Start with your resume</h3><p>Bring your PDF, DOCX, or text into Studio.</p><span>Open Studio →</span></Link><Link href={latest ? savedRunHistoryHref(latest, { restore: Boolean(projectResumeText(latest)) }) : "/app"} prefetch={false}><span className="home-eyebrow">02 · Reuse</span><h3>{latest ? "Build on saved work" : "Create your first project"}</h3><p>{latest ? "Open your latest version and choose a new target." : "Complete a tailoring run to save your work here."}</p><span>{latest ? "Open saved version" : "Create a project"} →</span></Link><Link href="/app#target" prefetch={false}><span className="home-eyebrow">03 · Target</span><h3>Start from a posting</h3><p>Add a role description or job URL, then bring your resume.</p><span>Add a job target →</span></Link></div>
      </section>
      <section aria-labelledby="projects-title" aria-busy={loading}>
        <div className="home-section-heading"><h2 id="projects-title">Your projects</h2><span>{projects.length} {nextOffset !== null ? "loaded" : "saved"} · latest version per project</span></div>
        <div className="home-filters" ref={filters} role="group" aria-label="Filter projects">{PROJECT_FILTERS.map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value} <span>{projects.filter((run) => matchesProjectFilter(run, value)).length}</span></button>)}</div>
        <p className="home-filter-help">Active includes all projects that are not archived.{nextOffset !== null ? " Counts reflect loaded projects; load older runs to see more." : ""}</p>
        {error && <p className="home-error" role="alert">{error}</p>}<p className="home-notice" role="status">{notice}</p>
        {visible.length ? <div className="home-project-grid">{visible.map((run) => <article className="home-project" key={run.projectId || run.accountRunId || run.id}><ResumeExcerpt run={run} /><div className="home-project-info"><span className="home-status">{applicationStatusCopy(run.applicationStatus).label}</span><h3>{run.projectTitle || run.filename}</h3><p>{run.filename}</p><small>{projectDate(run.createdAt)}</small><div className="home-actions"><Link className="home-button" href={savedRunHistoryHref(run, { restore: Boolean(projectResumeText(run)) })} prefetch={false}>Open project →</Link>{run.projectId && <button className="home-text-button" disabled={pendingProject !== null || loading} onClick={() => archive(run)}>{pendingProject === run.projectId ? "Saving…" : run.applicationStatus === "archived" ? "Move to Tailored" : "Archive"}</button>}</div></div></article>)}</div> : !error && <div className="home-empty"><h3>{projects.length ? `No ${filter.toLowerCase()} projects loaded` : "Your next opportunity starts here"}</h3><p>{projects.length ? "Try another filter or load older runs." : "Complete a tailoring run in Studio and your saved project will appear here."}</p><Link className="home-button home-primary" href="/app" prefetch={false}>Open Studio →</Link></div>}
        {nextOffset !== null && <button className="home-button home-load" disabled={loading || pendingProject !== null} onClick={loadMore}>{loading ? "Loading projects…" : initialPage === null && !runs.length ? "Try again" : "Load older runs"}</button>}
      </section>
    </div><SiteFooter variant="compact" />
  </main>;
}
