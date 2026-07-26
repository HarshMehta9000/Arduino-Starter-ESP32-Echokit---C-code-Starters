import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DIFF_STATS } from "@/lib/diff";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "smart_led · an LED controller, taken seriously";

/** Counted from the real files rather than typed, so it cannot go stale. */
const DESCRIPTION =
  `An interactive teardown of a ${DIFF_STATS.inoLines} line Arduino sketch: run the firmware ` +
  "in your browser, orbit the ESP32 board, diff the C++ port, and see where a hardcoded " +
  "10-bit ADC assumption breaks.";

/**
 * Absolute base for the social image. Vercel injects the production domain at
 * build time, so this resolves correctly once deployed without an edit here.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Arduino",
    "ESP32",
    "embedded",
    "C++",
    "firmware",
    "millis",
    "potentiometer",
    "ADC",
  ],
  authors: [{ name: "Harsh Mehta" }],
  openGraph: {
    title: TITLE,
    description:
      "Run a real Arduino sketch in the browser, orbit the ESP32 board, and see where the port breaks.",
    type: "website",
    images: [
      {
        url: "/media/social.png",
        width: 1200,
        height: 630,
        alt: "smart_led: an interactive teardown of an Arduino sketch, with a NodeMCU-32S board and the figures 1000ms intended against 3702ms on a 12-bit ADC.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Run a real Arduino sketch in the browser, orbit the ESP32 board, and see where the port breaks.",
    images: ["/media/social.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
