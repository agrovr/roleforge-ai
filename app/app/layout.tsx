import type { ReactNode } from "react";

import "../login/login.css";
import "./studio.css";
import "./gateway.css";
import "./upgrade.css";

export default function StudioLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
