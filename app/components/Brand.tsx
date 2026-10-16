import Link from "next/link";
import Image from "next/image";

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
    <Link className="brand" href={href} prefetch={false} aria-label={label}>
      <span className="brand-mark brand-fit-mark" aria-hidden="true">
        <Image className="brand-light-mark" src="/brand/logo-mark.svg" alt="" width={44} height={44} unoptimized />
        <Image className="brand-dark-mark" src="/brand/logo-mark-dark.svg" alt="" width={44} height={44} unoptimized />
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
