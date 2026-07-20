const LANDING_ANCHOR_BOOTSTRAP = `(() => {
  const ids = new Set(["how", "studio", "templates", "features", "pricing", "faq", "final-cta"]);
  const align = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!ids.has(id)) return;
    const target = document.getElementById(id);
    if (!target) return;
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    target.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
    root.style.scrollBehavior = previousScrollBehavior;
  };
  if (window.location.hash) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(align));
    window.addEventListener("load", align, { once: true });
  }
})();`;

export function LandingAnchorBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: LANDING_ANCHOR_BOOTSTRAP }} />;
}
