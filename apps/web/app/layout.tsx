import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipBook",
  description: "Book your next appointment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
