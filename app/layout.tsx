import type { Metadata } from "next";
import "./globals.css";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/Toaster";
import { CartProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: {
    default: "VEYTRA — Modern Essentials",
    template: "%s · VEYTRA",
  },
  description:
    "VEYTRA is a premium minimal fashion label. Considered men's and women's essentials in lasting materials — designed to be worn for years.",
  metadataBase: new URL("https://veytra.example.com"),
  openGraph: {
    title: "VEYTRA — Modern Essentials",
    description: "Premium minimal men's & women's apparel.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable @next/next/no-page-custom-font -- App Router: <link> in the root layout IS correct here (rule targets Pages Router). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Google Fonts: display serif + clean sans, loaded via <link>. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* eslint-enable @next/next/no-page-custom-font */}
      </head>
      <body>
        <CartProvider>
          <ToastProvider>
            <AnnouncementBar />
            <Navbar />
            <main>{children}</main>
            <Footer />
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
