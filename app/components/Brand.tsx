import Link from "next/link";

export function Brand({
  href = "/",
  label = "RoleForge AI home",
  studio = false,
}: {
  href?: string;
  label?: string;
  studio?: boolean;
}) {
  return (
    <Link className="brand" href={href} aria-label={label}>
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark-sheet sheet-one" />
        <span className="brand-mark-sheet sheet-two" />
        <span className="brand-mark-letter">R</span>
      </span>
      <span>
        <span className="brand-name">
          RoleForge <span className="brand-ai">AI</span>
        </span>
        {studio ? <span className="brand-kicker">Resume studio</span> : null}
      </span>
    </Link>
  );
}
