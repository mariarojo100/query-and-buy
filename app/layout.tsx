import type { Metadata } from 'next'
import './globals.css'
import { Geist, Fraunces } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600'],
  style: ['normal'],
});

export const metadata: Metadata = {
  title: 'Query & Buy — AI marketplace for the UAE',
  description: 'Snap. Sell. Done. Create listings from photos in seconds and buy & sell across the UAE.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable, fraunces.variable)}
    >
      <body className="min-h-screen">
        <ThemeProvider>
          {children}
          <MobileTabBar />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
