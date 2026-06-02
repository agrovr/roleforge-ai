"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { RoleForgeIcon, type RoleForgeIconName } from "../components/RoleForgeIcons";
import type { HelpQuickLink, HelpSection } from "./page";

type HelpSearchProps = {
  quickLinks: readonly HelpQuickLink[];
  helpSections: readonly HelpSection[];
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function textMatches(query: string, values: readonly string[]) {
  if (!query) return true;
  return values.some((value) => value.toLowerCase().includes(query));
}

function HelpQuickCard({ item }: { item: HelpQuickLink }) {
  return (
    <Link className="help-quick-link" href={item.href}>
      <span><RoleForgeIcon name={item.icon as RoleForgeIconName} size={16} /></span>
      <strong>{item.label}</strong>
      <small>{item.detail}</small>
    </Link>
  );
}

export function HelpSearch({ quickLinks, helpSections }: HelpSearchProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);

  const matchingLinks = useMemo(
    () => quickLinks.filter((item) => textMatches(normalizedQuery, [item.label, item.detail, item.href])),
    [normalizedQuery, quickLinks],
  );
  const matchingSections = useMemo(
    () => helpSections.filter((section) => textMatches(normalizedQuery, [section.title, ...section.body])),
    [normalizedQuery, helpSections],
  );
  const hasResults = matchingLinks.length > 0 || matchingSections.length > 0;
  const resultLabel = normalizedQuery
    ? `${matchingSections.length} topics and ${matchingLinks.length} actions match`
    : `${helpSections.length} topics and ${quickLinks.length} actions available`;

  return (
    <section className="help-search-shell" aria-label="Search RoleForge help">
      <div className="help-search-card">
        <label className="help-search-field">
          <span>Search help</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search billing, exports, saved projects, account..."
            aria-describedby="help-search-results"
          />
        </label>
        <div className="help-search-meta" id="help-search-results" role="status">
          <RoleForgeIcon name="scan" size={15} />
          <span>{resultLabel}</span>
        </div>
      </div>

      {hasResults ? (
        <>
          {matchingLinks.length ? (
            <nav className="help-quick-grid" aria-label="Help quick links">
              {matchingLinks.map((item) => <HelpQuickCard item={item} key={item.href} />)}
            </nav>
          ) : null}

          {matchingSections.length ? (
            <section className="legal-grid" aria-label="Help topics">
              {matchingSections.map((section) => (
                <article className="legal-card" key={section.title}>
                  <h2>{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </section>
          ) : null}
        </>
      ) : (
        <div className="help-search-empty" role="status">
          <strong>No matching help topic</strong>
          <span>Try account, export, billing, template, saved project, or send a support request with the current context attached.</span>
          <Link className="btn btn-soft btn-sm" href="/support?category=workflow&subject=Help+center+question&context=%2Fhelp#request">
            Contact support <RoleForgeIcon name="mail" size={13} />
          </Link>
        </div>
      )}
    </section>
  );
}
