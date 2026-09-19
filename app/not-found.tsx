import AppLink from "@/components/AppLink";

export default function NotFound() {
  return (
    <div className="container empty-state" style={{ paddingBlock: "8rem" }}>
      <span className="eyebrow">404</span>
      <h1 style={{ marginTop: "0.75rem" }}>Page not found</h1>
      <p className="muted">
        The page you&apos;re looking for has moved or no longer exists.
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <AppLink href="/" className="btn btn--solid">
          <span>Back to home</span>
        </AppLink>
        <AppLink href="/women" className="btn btn--outline">
          <span>Shop Women</span>
        </AppLink>
      </div>
    </div>
  );
}
