import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

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
    <html lang="en" suppressHydrationWarning className={inter.variable} style={{ margin: 0, padding: 0 }}>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#FAFAFA" }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
