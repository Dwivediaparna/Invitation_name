import type {Metadata} from 'next';
import './globals.css';
import { Geist, Noto_Serif_Devanagari } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const notoSerifDevanagari = Noto_Serif_Devanagari({
  weight: ['400', '500', '600', '700'],
  subsets: ['devanagari'],
  variable: '--font-noto-serif-devanagari',
});

export const metadata: Metadata = {
  title: 'My Google AI Studio App',
  description: 'My Google AI Studio App',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, notoSerifDevanagari.variable)}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
