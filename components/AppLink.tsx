"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";

type LinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Link wrapper that accepts dynamic hrefs such as IDs, query strings,
 * and hash anchors while keeping the Route cast centralized here.
 */
export default function AppLink({ href, children, ...rest }: LinkProps) {
  return (
    <Link href={href as Route} {...rest}>
      {children}
    </Link>
  );
}
