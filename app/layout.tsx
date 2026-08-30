import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const dataFont = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aquas — Private medical license verification",
  description: "Verify doctor license status without collecting personal files.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} ${dataFont.variable}`}
    >
      <body className="bg-[#0a0a0a] text-white">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}
