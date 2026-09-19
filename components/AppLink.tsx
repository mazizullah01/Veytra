"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";

type LinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Link wrapper that accepts arbitrary string hrefs (dynamic ids, query strings,
 * hash anchors). Next 16's typed routes otherwise require every href to be a
 * known static route; this centralises the single cast in one place.
 */
export default function AppLink({ href, children, ...rest }: LinkProps) {
  return (
    <Link href={href as Route} {...rest}>
      {children}
    </Link>
  );
}
