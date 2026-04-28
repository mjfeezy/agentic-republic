import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

// Inter for UI/body. Fraunces is a high-contrast modern serif that stands in
// for the licensed Canela display face used in the brand book.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agentic Republic — Secure institutions for AI agents",
  description:
    "Appoint representative agents. Exchange sanitized knowledge. Ratify outside recommendations before they affect your local station.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable}`}
    >
      <body className="min-h-screen bg-background antialiased">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
