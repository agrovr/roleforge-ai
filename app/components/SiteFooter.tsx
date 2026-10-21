import Link from "next/link";
import { Brand } from "./Brand";
import { RoleForgeIcon } from "./RoleForgeIcons";

const footerColumns = [
  { title: "Product", links: [["Resume studio", "/app"], ["Templates", "/templates"], ["Features", "/?view=site#features"], ["Pricing", "/pricing"]] },
  { title: "Account", links: [["Sign in", "/login?next=%2Fapp"], ["Settings", "/settings"], ["Saved projects", "/settings#projects"], ["Billing", "/settings#billing"]] },
  { title: "Support", links: [["Help", "/help"], ["Support", "/support"], ["Status", "/status"], ["Updates", "/updates"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] },
] as const;

export function SiteFooter({ active = "", variant = "rich" }: { active?: string; variant?: "rich" | "compact" }) {
  return (
    <footer className={`site-footer${variant === "compact" ? " site-footer-compact" : ""}`}>
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          {variant === "rich" && <div className="site-footer-brand">
            <Brand href="/" label="RoleForge AI home" />
            <p>A focused resume tailoring workspace with protected studio access, saved project history, and Stripe-backed Premium billing.</p>
            <div className="site-safeguards">
              <span><RoleForgeIcon name="lock" size={13} /> Protected studio</span>
              <span><RoleForgeIcon name="download" size={13} /> Account exports</span>
              <span><RoleForgeIcon name="layers" size={13} /> Premium DOCX/TXT</span>
            </div>
          </div>}
          {footerColumns.map(({ title, links }) => (
            <nav key={title} aria-label={`${title} links`}>
              <h3>{title}</h3>
              {links.map(([label, href]) => <Link key={href} prefetch={false} href={href} aria-current={href === active ? "page" : undefined}>{label}</Link>)}
              {title === "Legal" && <><span>Payments by Stripe</span><span>Google sign-in supported</span></>}
            </nav>
          ))}
        </div>
        <div className="site-footer-meta">
          <span>&copy; {new Date().getFullYear()} RoleForge AI. All rights reserved.</span>
          <nav aria-label="Footer legal links"><Link prefetch={false} href="/privacy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link><Link prefetch={false} href="/status">Status</Link></nav>
          <span>Focused resume tailoring for real applications.</span>
        </div>
      </div>
    </footer>
  );
}
