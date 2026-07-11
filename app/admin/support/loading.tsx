import { Brand } from "@/app/components/Brand";

export default function AdminSupportLoading() {
  return (
    <main className="admin-support-shell admin-support-loading" aria-busy="true">
      <header className="admin-support-commandbar">
        <Brand href="/" label="RoleForge AI home" />
        <span className="admin-support-loading-label" role="status">Loading operator inbox…</span>
      </header>
      <section className="admin-support-loading-hero" aria-hidden="true">
        <div>
          <span />
          <span />
          <span />
        </div>
        <div />
      </section>
      <div className="admin-support-loading-filter" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <section className="admin-support-loading-card" aria-hidden="true">
        <div className="admin-support-loading-card-head"><span /><span /></div>
        <div className="admin-support-loading-columns">
          <div><span /><span /><span /></div>
          <div><span /><span /><span /></div>
        </div>
      </section>
    </main>
  );
}
