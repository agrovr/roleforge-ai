"use client";

import Link from "next/link";
import { useState } from "react";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { supportRequestHref } from "../lib/supportRequests";

export type PricingPlansProps = {
  prices: { monthly: number; yearly: number; currency: string };
  freeRunLimit: number | null;
  signedIn: boolean;
  premiumActive: boolean;
  premiumEnding: boolean;
  checkoutReady: boolean;
  initialInterval: "month" | "year";
  studioHref: string;
};

export function PricingPlans({ prices, freeRunLimit, signedIn, premiumActive, premiumEnding, checkoutReady, initialInterval, studioHref }: PricingPlansProps) {
  const [interval, setInterval] = useState(initialInterval);
  const yearly = interval === "year";
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: prices.currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
  const savings = Math.round((1 - prices.yearly / (prices.monthly * 12)) * 100);
  const allowance = freeRunLimit === null ? "Unlimited tailoring runs" : `${freeRunLimit} tailoring runs each month`;
  const paused = !premiumActive && !checkoutReady;
  const signInHref = `/login?next=${encodeURIComponent(`/pricing?interval=${interval}`)}`;
  const billingSupportHref = supportRequestHref({ category: "billing", subject: "Billing or Premium access", contextUrl: "/pricing" });
  const freeFeatures = [allowance, "DOCX, PDF, and TXT upload", "PDF export", "Saved project sync and restore", "Job description or public URL targeting"];
  const premiumFeatures = ["Everything in Studio", "Unlimited tailoring runs", "PDF, DOCX, and TXT exports", "Access through the paid period when you cancel at period end"];
  const comparison = [
    ["Tailoring runs", freeRunLimit === null ? "Unlimited" : `${freeRunLimit} each month`, "Unlimited"],
    ["Resume upload", "DOCX, PDF, TXT", "DOCX, PDF, TXT"],
    ["PDF export", "Included", "Included"],
    ["DOCX and TXT exports", "Not included", "Included"],
    ["Saved project history", "Included", "Included"],
    ["Structure and keyword review", "Included", "Included"],
    ["Cover letter and prep drafts", "Included", "Included"],
  ];
  const faqs = [
    ["What counts as a run?", "A run is a tailoring pass using your resume and a target role. Opening a saved project or exporting its existing draft does not start another tailoring run."],
    ["What happens when I reach the free limit?", "You can return to saved projects. New tailoring runs become available when your monthly allowance resets or Premium becomes active."],
    ["How does yearly billing work?", `${money(prices.yearly)} is billed once a year, equivalent to ${money(Math.round(prices.yearly / 12))} per month. Monthly billing is ${money(prices.monthly)} each month.`],
    ["Can I cancel?", "Manage your subscription through billing in Settings. When cancellation is scheduled for period end, Premium access continues through the paid period."],
    ["Do I need a card to start?", "No. The free plan needs an account. Sign in with Google or an email magic link to use the studio."],
    ["Where can I get billing help?", "Contact support for payment, invoice, refund, or access questions. Include your account reference and the relevant billing details; never send card details."],
  ];

  return <>
    <section className="pricing-hero" aria-labelledby="pricing-title">
      <span className="eyebrow">Pricing</span>
      <h1 id="pricing-title">Start free. <em>Upgrade</em> when you need more room.</h1>
      <p>Free covers upload, targeting, review, and PDF export with a monthly run limit. Premium removes the cap and adds DOCX and TXT.</p>
      <div className="pricing-interval" role="group" aria-label="Billing interval">
        <button type="button" aria-pressed={!yearly} onClick={() => setInterval("month")}>Monthly</button>
        <button type="button" aria-pressed={yearly} onClick={() => setInterval("year")}>Yearly {savings > 0 && <span>Save {savings}%</span>}</button>
      </div>
    </section>
    <section className="pricing-plans" id="plans" tabIndex={-1} aria-label="Plan comparison">
      <article className="pricing-plan" aria-labelledby="free-plan-title">
        <div className="pricing-plan-heading"><h2 id="free-plan-title">Studio</h2><span>{signedIn && !premiumActive ? "Current plan" : "Free plan"}</span></div>
        <div className="pricing-amount"><strong>{money(0)}</strong><span>free</span></div>
        <p>Tailor your resume for a target role and export a clean PDF. {allowance}.</p>
        <ul>{freeFeatures.map((feature) => <li key={feature}><RoleForgeIcon name="check" size={16} />{feature}</li>)}</ul>
        <Link className="pricing-button pricing-secondary" href={studioHref} prefetch={false}>Open the studio</Link>
      </article>
      <article className="pricing-plan pricing-premium" aria-labelledby="premium-plan-title">
        <div className="pricing-plan-heading"><h2 id="premium-plan-title">Premium</h2><span>{premiumActive ? premiumEnding ? "Active until period end" : "Current plan" : paused ? "Unavailable" : "More room"}</span></div>
        <div className="pricing-price-summary" aria-live="polite" aria-atomic="true">
          <div className="pricing-amount"><strong>{money(yearly ? Math.round(prices.yearly / 12) : prices.monthly)}</strong><span>/month{yearly ? " equivalent" : ""}</span></div>
          <p>{yearly ? `${money(prices.yearly)} billed once a year${savings > 0 ? ` — ${savings}% less than paying monthly` : ""}.` : `${money(prices.monthly)} billed monthly.`}</p>
        </div>
        <ul>{premiumFeatures.map((feature) => <li key={feature}><RoleForgeIcon name="check" size={16} />{feature}</li>)}</ul>
        {paused && <p className="pricing-billing-notice">Premium checkout is currently unavailable. The free studio remains open with PDF export.</p>}
        {premiumActive ? <Link className="pricing-button pricing-primary" href="/settings#billing" prefetch={false}>Manage Premium</Link>
          : paused ? <Link className="pricing-button pricing-primary" href={studioHref} prefetch={false}>Use free studio</Link>
          : !signedIn ? <Link className="pricing-button pricing-primary" href={signInHref} prefetch={false}>Sign in to upgrade</Link>
          : <form action="/api/billing/checkout" method="post"><input type="hidden" name="interval" value={interval} /><button className="pricing-button pricing-primary" type="submit">Continue to {yearly ? "yearly" : "monthly"} checkout</button></form>}
        <small>Payments are handled by Stripe. Manage billing in Settings.</small>
      </article>
    </section>
    <section className="pricing-comparison" aria-labelledby="compare-title">
      <span className="eyebrow">Side by side</span><h2 id="compare-title">What changes with Premium</h2>
      <table><caption className="sr-only">Plan feature comparison</caption><thead><tr><th scope="col">Capability</th><th scope="col">Free</th><th scope="col">Premium</th></tr></thead>
        <tbody>{comparison.map(([feature, free, premium]) => <tr key={feature}><th scope="row">{feature}</th><td>{free}</td><td>{premium}</td></tr>)}</tbody>
      </table>
    </section>
    <section className="pricing-faq" id="billing-faq" aria-labelledby="billing-faq-title">
      <span className="eyebrow">Billing questions</span><h2 id="billing-faq-title">Straight answers about money</h2>
      <div className="pricing-faq-grid">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      <Link href={billingSupportHref} prefetch={false}>Get billing help <RoleForgeIcon name="arrow" size={14} /></Link>
    </section>
    <section className="pricing-final-cta">
      <div><h2>Try it free. No card needed.</h2><p>Start with the free studio. Upgrade when you need more runs or editable export formats.</p></div>
      <div><Link className="pricing-button pricing-primary" href={studioHref} prefetch={false}>Open the studio <RoleForgeIcon name="arrow" size={15} /></Link><a className="pricing-button pricing-secondary" href="#billing-faq">Read the FAQ</a></div>
    </section>
  </>;
}
