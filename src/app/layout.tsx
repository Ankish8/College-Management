import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { PWAProvider } from "@/components/providers/pwa-provider";

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
  keywords: "college management, timetable, attendance, JLU, education, student portal",
  authors: [{ name: "JLU Design Department" }],
  creator: "Jagran Lakecity University",
  publisher: "JLU Design Department",
  
  // PWA Configuration
  manifest: "/manifest.json",
  
  // Mobile optimization
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover"
  },
  
  // Theme colors for mobile browsers
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" }
  ],
  
  // Apple specific meta tags
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JLU CMS",
    startupImage: [
      {
        url: "/screenshots/mobile-dashboard.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
      }
    ]
  },
  
  // Microsoft specific
  other: {
    "msapplication-TileColor": "#2563eb",
    "msapplication-config": "/browserconfig.xml"
  },
  
  // Open Graph for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXTAUTH_URL || "https://cms.jlu.edu.in",
    siteName: "JLU College Management System",
    title: "JLU College Management System",
    description: "Comprehensive timetable and attendance management for Jagran Lakecity University",
    images: [
      {
        url: "/screenshots/desktop-dashboard.png",
        width: 1280,
        height: 720,
        alt: "JLU CMS Dashboard"
      }
    ]
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "JLU College Management System",
    description: "Comprehensive timetable and attendance management for Jagran Lakecity University",
    images: ["/screenshots/desktop-dashboard.png"]
  },
  
  // Additional mobile optimizations
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical resources */}
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Safari specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JLU CMS" />
        
        {/* Microsoft specific */}
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Disable automatic telephone number detection */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* Performance hints */}
        <link rel="prefetch" href="/api/auth/session" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased touch-manipulation`}
        suppressHydrationWarning={true}
      >
        <QueryProvider>
          <Providers>
            <PWAProvider>
              {children}
            </PWAProvider>
          </Providers>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
