import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const spaceSearch = localFont({
      src: './fonts/TRAINEX-Demo.woff2'
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceSearch.className}>
      <body className="w-screen h-screen">{children}</body>
    </html>
  );
}
