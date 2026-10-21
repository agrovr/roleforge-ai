import type { ReactNode } from "react";

import "./admin-support.css";
import "./upgrade.css";

export default function AdminSupportLayout({ children }: { children: ReactNode }) {
  return <div className="rf-admin-page">{children}</div>;
}
