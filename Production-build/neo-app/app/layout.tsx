import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Space Search — NEO Prediction System",
  description: "Near Earth Object hazard classification and miss-distance prediction powered by machine learning.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: "var(--bg-base)" }}>
        {children}
      </body>
    </html>
  );
}
