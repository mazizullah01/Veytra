export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container prose">
      <span className="eyebrow">Our story</span>
      <h1>Considered clothing, made to last.</h1>
      <p>
        VEYTRA began with a simple frustration: the middle ground between
        fast-fashion and luxury had all but disappeared. We set out to build a
        wardrobe of quiet, well-made essentials — pieces you reach for daily and
        keep for years.
      </p>
      <p>
        Every garment starts with the fabric. We work with a small group of
        mills across Portugal and Italy, favouring natural fibres, responsible
        dyeing and construction that ages gracefully rather than falling apart
        after a season.
      </p>

      <h2>Design principles</h2>
      <ul>
        <li>Cut for real life — comfortable, versatile, quietly confident.</li>
        <li>Materials first — merino, organic cotton, European linen, silk.</li>
        <li>Small collections, produced in limited runs to reduce waste.</li>
        <li>Fair, transparent pricing with no seasonal mark-ups.</li>
      </ul>

      <h2>Our promise</h2>
      <p>
        Free worldwide shipping over $75, free returns within 30 days, and a
        repair service for every garment we make. If it isn&apos;t right, we&apos;ll
        make it right.
      </p>
    </div>
  );
}
