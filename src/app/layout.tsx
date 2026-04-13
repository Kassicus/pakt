import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SwRegister } from "@/components/app/SwRegister";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { ThemeProvider } from "@/components/app/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pakt — move without the mess",
  description:
    "Inventory, triage, and pack your move. Predict boxes and trucks. QR-coded labels make unpacking easy.",
  applicationName: "pakt",
  appleWebApp: { capable: true, title: "pakt", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider delay={200}>
            {children}
            <InstallPrompt />
            <Toaster richColors closeButton />
          </TooltipProvider>
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
