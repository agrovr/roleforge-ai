"use client";

import Link from "next/link";
import { useState } from "react";

import { ResumePreview } from "./ResumePreview";
import { RoleForgeIcon, type RoleForgeIconName } from "./RoleForgeIcons";

type DemoView = "resume" | "target" | "tailor" | "history";
type TargetSource = "url" | "text";
type HistoryVersion = "current" | "previous";

const NAV_ITEMS: ReadonlyArray<{
  id: DemoView;
  icon: RoleForgeIconName;
  label: string;
  meta: string;
}> = [
  { id: "resume", icon: "doc", label: "Resume", meta: "Ready" },
  { id: "target", icon: "target", label: "Job target", meta: "Set" },
  { id: "tailor", icon: "sparkle", label: "AI tailor", meta: "Review" },
  { id: "history", icon: "chart", label: "History", meta: "Saved" },
];

const VIEW_COPY: Record<DemoView, { title: string; detail: string; guidance: string }> = {
  resume: {
    title: "Resume studio",
    detail: "Inspect a complete sample draft and choose what to review next.",
    guidance: "Explore the sample resume, then open Fit signals to see how review works.",
  },
  target: {
    title: "Job target",
    detail: "Switch between the URL and pasted-text paths used by the real workflow.",
    guidance: "A real run accepts either a public posting URL or the role description text.",
  },
  tailor: {
    title: "Review suggestions",
    detail: "Mark illustrative guidance as reviewed without changing a real resume.",
    guidance: "Real suggestions stay tied to the uploaded resume and target in the protected studio.",
  },
  history: {
    title: "Saved project history",
    detail: "Compare sample versions and see what a restorable run keeps together.",
    guidance: "Signed-in runs can keep their draft, target, template direction, and export links together.",
  },
};

const GUIDANCE: Record<DemoView, ReadonlyArray<[RoleForgeIconName, string, string]>> = {
  resume: [
    ["check", "Review before export", "Keep the source visible while checking the sample draft."],
    ["scan", "Simple structure", "Headings and bullets stay easy to scan in the preview."],
  ],
  target: [
    ["link", "Two input paths", "Use a public role URL or paste the description directly."],
    ["briefcase", "Optional context", "Company context can be added when it helps explain the role."],
  ],
  tailor: [
    ["sparkle", "Review every change", "Suggestions are guidance, not automatic replacements."],
    ["check", "Keep your judgment", "Accept only the wording that remains accurate for your experience."],
  ],
  history: [
    ["chart", "Reopen useful work", "Saved runs can return to the studio when their source snapshot is available."],
    ["download", "Exports stay explicit", "PDF is free; DOCX and TXT remain Premium formats."],
  ],
};

const REVIEW_SUGGESTIONS = [
  { id: "impact", title: "Clarify the impact", detail: "Add an outcome only when the source experience supports it." },
  { id: "terms", title: "Check target terms", detail: "Compare role language without forcing keywords into the draft." },
  { id: "format", title: "Keep parsing simple", detail: "Use clear headings and conventional bullet structure." },
] as const;

const HISTORY_VERSIONS: ReadonlyArray<{
  id: HistoryVersion;
  label: string;
  date: string;
  detail: string;
}> = [
  { id: "current", label: "Product operations", date: "Current sample", detail: "Essential template · PDF ready · target saved" },
  { id: "previous", label: "Program manager", date: "Earlier sample", detail: "Professional template · review notes saved" },
];

export function LandingStudioDemo({ studioHref }: { studioHref: string }) {
  const [activeView, setActiveView] = useState<DemoView>("resume");
  const [targetSource, setTargetSource] = useState<TargetSource>("url");
  const [reviewedSuggestions, setReviewedSuggestions] = useState<string[]>(["impact"]);
  const [historyVersion, setHistoryVersion] = useState<HistoryVersion>("current");
  const [showHighlights, setShowHighlights] = useState(true);

  const activeCopy = VIEW_COPY[activeView];
  const selectedHistory = HISTORY_VERSIONS.find((version) => version.id === historyVersion) ?? HISTORY_VERSIONS[0];

  function selectView(view: DemoView) {
    setActiveView(view);
  }

  function resetDemo() {
    setActiveView("resume");
    setTargetSource("url");
    setReviewedSuggestions(["impact"]);
    setHistoryVersion("current");
    setShowHighlights(true);
  }

  function toggleSuggestion(id: string) {
    setReviewedSuggestions((current) => current.includes(id)
      ? current.filter((suggestionId) => suggestionId !== id)
      : [...current, id]);
  }

  return (
    <div className="dash-mock dash-demo" data-demo-view={activeView} aria-label="Interactive sample of the RoleForge studio">
      <div className="dash-mock-head">
        <div className="dash-traffic" aria-hidden="true"><span /><span /><span /></div>
        <div className="dash-mock-url">Try the sample · choose a workspace view</div>
        <button
          aria-label="Reset interactive sample"
          className="dash-demo-reset"
          title="Reset interactive sample"
          type="button"
          onClick={resetDemo}
        >
          <RoleForgeIcon name="undo" size={13} /> <span>Reset</span>
        </button>
      </div>
      <div className="dash-mock-body">
        <aside className="dash-side" aria-label="Sample studio sections">
          <div className="dash-side-label">Workspace</div>
          {NAV_ITEMS.map((item) => (
            <button
              className={`dash-side-item${activeView === item.id ? " active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => selectView(item.id)}
              aria-pressed={activeView === item.id}
            >
              <RoleForgeIcon name={item.icon} size={15} />
              <span>{item.label}</span>
              <span className="dash-pill">{item.meta}</span>
            </button>
          ))}
          <div className="dash-side-divider" />
          <div className="dash-side-label">Real workflow</div>
          <Link className="dash-side-item dash-side-link" href={studioHref} prefetch={false}>
            <RoleForgeIcon name="arrow" size={15} />
            <span>Open studio</span>
          </Link>
        </aside>

        <div className="dash-main">
          <nav className="dash-demo-tabs" aria-label="Sample studio views">
            {NAV_ITEMS.map((item) => (
              <button
                className={activeView === item.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => selectView(item.id)}
                aria-pressed={activeView === item.id}
              >
                <RoleForgeIcon name={item.icon} size={14} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="dash-main-head">
            <div>
              <span className="dash-demo-kicker">Sample workspace</span>
              <h3>{activeCopy.title}</h3>
              <p>{activeCopy.detail}</p>
            </div>
            <Link className="btn btn-brand btn-sm" href={studioHref} prefetch={false}><RoleForgeIcon name="arrow" size={14} />Open real studio</Link>
          </div>
          <span className="sr-only" role="status" aria-live="polite">Showing {activeCopy.title} sample.</span>

          <div className="dash-demo-content" key={activeView}>
            {activeView === "resume" ? (
              <>
                <div className="dash-stats" aria-label="Sample workflow readiness">
                  <div className="dash-stat"><div className="dash-stat-label">Resume</div><div className="dash-stat-value">Ready</div><div className="dash-stat-delta">Complete sample</div></div>
                  <div className="dash-stat"><div className="dash-stat-label">Target</div><div className="dash-stat-value">Added</div><div className="dash-stat-delta">Text or URL</div></div>
                  <div className="dash-stat"><div className="dash-stat-label">Export</div><div className="dash-stat-value">PDF</div><div className="dash-stat-delta">Free format</div></div>
                </div>
                <div className="dash-resume-card">
                  <div className="dash-resume-thumb" aria-hidden="true"><ResumePreview highlight={showHighlights} /></div>
                  <div className="dash-resume-info">
                    <div>
                      <h4 className="dash-resume-title">Role-targeted resume draft</h4>
                      <div className="dash-resume-meta"><span>Sample preview</span><span>PDF export</span><span>Review before sending</span></div>
                      <div className="dash-progress">
                        <div className="dash-progress-row"><span>Workflow status</span><span>Ready</span></div>
                        <div className="dash-progress-track"><span /></div>
                      </div>
                    </div>
                    <div className="dash-resume-actions">
                      <button className={`btn btn-soft btn-sm${showHighlights ? " active" : ""}`} type="button" onClick={() => setShowHighlights((current) => !current)} aria-pressed={showHighlights}>
                        <RoleForgeIcon name="edit" size={13} />{showHighlights ? "Hide" : "Show"} sample change
                      </button>
                      <button className="btn btn-soft btn-sm" type="button" onClick={() => selectView("tailor")}><RoleForgeIcon name="chart" size={13} />Fit signals</button>
                      <Link className="btn btn-soft btn-sm" href={studioHref} prefetch={false}><RoleForgeIcon name="arrow" size={13} />Use my resume</Link>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {activeView === "target" ? (
              <section className="dash-demo-surface" aria-labelledby="dash-demo-target-title">
                <div className="dash-demo-surface-head">
                  <div><span>Sample target</span><h4 id="dash-demo-target-title">Product Operations Manager</h4></div>
                  <div className="dash-demo-toggle" role="group" aria-label="Sample target source">
                    <button type="button" className={targetSource === "url" ? "active" : ""} onClick={() => setTargetSource("url")} aria-pressed={targetSource === "url"}>Public URL</button>
                    <button type="button" className={targetSource === "text" ? "active" : ""} onClick={() => setTargetSource("text")} aria-pressed={targetSource === "text"}>Pasted text</button>
                  </div>
                </div>
                <p>{targetSource === "url" ? "https://jobs.example.com/product-operations" : "Lead cross-functional planning, launch readiness, and product operations programs."}</p>
                <dl className="dash-demo-details">
                  <div><dt>Source</dt><dd>{targetSource === "url" ? "Public posting URL" : "Role description text"}</dd></div>
                  <div><dt>Context</dt><dd>Sample company notes</dd></div>
                  <div><dt>Focus</dt><dd>Planning, launches, operations</dd></div>
                </dl>
                <div className="dash-demo-terms" aria-label="Sample target terms"><span>launch readiness</span><span>roadmap planning</span><span>stakeholder communication</span></div>
              </section>
            ) : null}

            {activeView === "tailor" ? (
              <section className="dash-demo-surface" aria-labelledby="dash-demo-tailor-title">
                <div className="dash-demo-surface-head"><div><span>Illustrative guidance</span><h4 id="dash-demo-tailor-title">Review sample suggestions</h4></div><small>{reviewedSuggestions.length} of {REVIEW_SUGGESTIONS.length} reviewed</small></div>
                <p>These examples demonstrate the review flow. A real run generates guidance from your uploaded resume and target.</p>
                <div className="dash-demo-review-list">
                  {REVIEW_SUGGESTIONS.map((suggestion) => {
                    const reviewed = reviewedSuggestions.includes(suggestion.id);
                    return (
                      <button key={suggestion.id} type="button" className={reviewed ? "reviewed" : ""} onClick={() => toggleSuggestion(suggestion.id)} aria-pressed={reviewed}>
                        <span className="dash-demo-review-icon"><RoleForgeIcon name={reviewed ? "check" : "sparkle"} size={15} /></span>
                        <span><strong>{suggestion.title}</strong><small>{suggestion.detail}</small></span>
                        <span className="dash-demo-review-state">{reviewed ? "Reviewed" : "Review"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {activeView === "history" ? (
              <section className="dash-demo-surface" aria-labelledby="dash-demo-history-title">
                <div className="dash-demo-surface-head"><div><span>Sample project</span><h4 id="dash-demo-history-title">Saved versions</h4></div><small>Account sync preview</small></div>
                <p>Select a sample version to inspect the context a restorable run can keep together.</p>
                <div className="dash-demo-history-list">
                  {HISTORY_VERSIONS.map((version) => (
                    <button type="button" key={version.id} className={historyVersion === version.id ? "active" : ""} onClick={() => setHistoryVersion(version.id)} aria-pressed={historyVersion === version.id}>
                      <span><strong>{version.label}</strong><small>{version.detail}</small></span><span>{version.date}</span>
                    </button>
                  ))}
                </div>
                <div className="dash-demo-history-detail"><RoleForgeIcon name="check" size={15} /><span><strong>{selectedHistory.label}</strong><small>{selectedHistory.detail}</small></span></div>
              </section>
            ) : null}
          </div>

          <p className="dash-demo-disclosure"><RoleForgeIcon name="lock" size={13} />Interactive sample: nothing is uploaded, saved, generated, or exported here.</p>
        </div>

        <aside className="dash-aside">
          <div>
            <div className="eyebrow">Interactive sample</div>
            <h4>{activeCopy.title}</h4>
            <p>{activeCopy.guidance}</p>
          </div>
          {GUIDANCE[activeView].map(([icon, title, detail]) => (
            <div className="dash-aside-tip" key={title}>
              <div className="dash-aside-tip-head"><RoleForgeIcon name={icon} size={12} />{title}</div>
              <p>{detail}</p>
            </div>
          ))}
          <Link className="btn btn-soft btn-sm dash-demo-aside-action" href={studioHref} prefetch={false}>Open real studio <RoleForgeIcon name="arrow" size={13} /></Link>
        </aside>
      </div>
    </div>
  );
}
