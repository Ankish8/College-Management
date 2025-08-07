import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Faster font loading
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Faster font loading
  preload: true,
});

export const metadata: Metadata = {
  title: "JLU College Management System",
  description: "Timetable and Attendance Management for Jagran Lakecity University",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JLU CMS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ServiceWorkerProvider>
          <QueryProvider>
            <Providers>
              {children}
            </Providers>
          </QueryProvider>
        </ServiceWorkerProvider>
        <Toaster />
      </body>
    </html>
  );
}
