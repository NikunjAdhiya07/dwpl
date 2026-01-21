import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DWPL - Manufacturing Management System",
  description: "Wire Drawing & Annealing Operations Management",
  metadataBase: new URL('https://dwpl.vercel.app'),
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'DWPL - Manufacturing Management System',
    description: 'Wire Drawing & Annealing Operations Management',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'DWPL Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DWPL - Manufacturing Management System',
    description: 'Wire Drawing & Annealing Operations Management',
    images: ['/twitter-image.png'],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <main className="p-6 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
