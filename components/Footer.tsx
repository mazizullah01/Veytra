import AppLink from "./AppLink";
import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  TikTokIcon,
  XIcon,
} from "./Icons";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Women", href: "/women" },
      { label: "Men", href: "/men" },
      { label: "New Arrivals", href: "/#new" },
      { label: "Trending", href: "/#trending" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Journal", href: "/about" },
      { label: "Stores", href: "/contact" },
    ],
  },
  {
    title: "Support & Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Shipping", href: "/contact" },
      { label: "Returns", href: "/contact" },
      { label: "Terms of Service", href: "/privacy" },
    ],
  },
];

const SOCIALS = [
  { label: "Instagram", Icon: InstagramIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "X", Icon: XIcon },
  { label: "Pinterest", Icon: PinterestIcon },
  { label: "TikTok", Icon: TikTokIcon },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <p className="footer__brand">VELOUR</p>
            <p className="footer__blurb">
              Considered, modern essentials cut from lasting materials. Designed
              in small collections, made to be worn for years — not seasons.
            </p>
            <div className="footer__socials">
              {SOCIALS.map(({ label, Icon }) => (
                <a
                  key={label}
                  className="footer__social"
                  href="https://example.com"
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div className="footer__col" key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <AppLink href={link.href}>{link.label}</AppLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <span>© {year} VELOUR. All rights reserved.</span>
          <span>Designed for the modern wardrobe.</span>
        </div>
      </div>
    </footer>
  );
}
