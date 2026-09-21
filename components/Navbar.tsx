"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PRODUCTS } from "@/lib/data";
import { money } from "@/lib/format";
import { useCart } from "@/lib/store";
import Img from "./Img";
import {
  ArrowRightIcon,
  BagIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "./Icons";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/women", label: "Women" },
  { href: "/men", label: "Men" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { count, ready } = useCart();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while an overlay is open.
  useEffect(() => {
    const locked = menuOpen || searchOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  // Close overlays on navigation (deferred a tick so we never flush sync state
  // during an effect, and so the new pathname is already committed).
  useEffect(() => {
    const id = window.setTimeout(() => {
      setMenuOpen(false);
      setSearchOpen(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  // Focus the search field when the overlay opens.
  useEffect(() => {
    if (searchOpen) {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [searchOpen]);

  // Escape closes overlays.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return PRODUCTS.filter((product) =>
      `${product.name} ${product.subcategory} ${product.category}`
        .toLowerCase()
        .includes(q),
    ).slice(0, 6);
  }, [query]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}` as Route);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <>
      <header className="nav">
        <div className="container nav__inner">
          <nav className="nav__links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav__link"
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            className="icon-btn nav__hamburger"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>

          <Link href="/" className="nav__brand" aria-label="VEYTRA home">
            VEYTRA
          </Link>

          <div className="nav__actions">
            <button
              className="icon-btn"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </button>
            <Link href="/login" className="icon-btn" aria-label="Account">
              <UserIcon />
            </Link>
            <Link href="/cart" className="icon-btn" aria-label="Cart">
              <BagIcon />
              {ready && count > 0 && (
                <span className="nav__badge" aria-hidden>
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="drawer" role="dialog" aria-label="Menu">
            <div className="drawer__top">
              <span className="eyebrow">Menu</span>
              <button
                className="icon-btn"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="drawer__links">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="drawer__link">
                  {link.label}
                </Link>
              ))}
              <Link href="/cart" className="drawer__link">
                Cart{ready && count > 0 ? ` (${count})` : ""}
              </Link>
            </nav>
            <div className="drawer__foot">
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/login">Sign in / Create account</Link>
            </div>
          </div>
        </>
      )}

      {/* -------------------------------------------------- search overlay */}
      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-label="Search">
          <div className="search-overlay__top">
            <span className="search-overlay__label">Search</span>
            <button
              className="icon-btn"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="search-overlay__body">
            <form onSubmit={submitSearch} role="search">
              <input
                ref={searchInputRef}
                className="search-overlay__input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you looking for?"
                aria-label="Search products"
              />
            </form>
            <p className="search-overlay__hint">
              {query.trim().length < 2
                ? "Try “coat”, “dress” or “knitwear”"
                : `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} — press Enter to see all`}
            </p>

            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="suggestion"
                    onClick={() => setQuery("")}
                  >
                    <span className="suggestion__thumb">
                      <Img
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="56px"
                      />
                    </span>
                    <span>
                      <span className="suggestion__name">{product.name}</span>
                      <br />
                      <span className="suggestion__meta">
                        {product.category} · {product.subcategory}
                      </span>
                    </span>
                    <span className="suggestion__price">
                      {money(product.price)}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {query.trim().length >= 2 && (
              <div style={{ marginTop: "1.5rem" }}>
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}` as Route}
                  className="link-underline"
                  onClick={() => setQuery("")}
                >
                  See all results for “{query.trim()}”
                  <ArrowRightIcon size={14} style={{ display: "inline" }} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
