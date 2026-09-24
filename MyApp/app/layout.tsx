import type { Metadata } from "next";
import { DM_Sans, Inter, Lato, Open_Sans, Poppins, Roboto } from "next/font/google";
import { Providers } from "./providers";

// Every face the Design tab's font picker offers, exposed as CSS variables so
// a booking page can switch between them without an extra webfont request.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap" });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lato", display: "swap" });

const fontVariables = [inter, dmSans, poppins, roboto, openSans, lato].map((font) => font.variable).join(" ");

export const metadata: Metadata = {
  title: "MyApp",
  description: "Generated with Chakra UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables} style={{ margin: 0, padding: 0 }}>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#FAFAFA" }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
