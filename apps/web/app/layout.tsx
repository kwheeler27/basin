import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basin — Colorado River",
  description:
    "A digital twin of the Colorado River: live reservoir conditions, an explicit system model, and what-if simulation. Reduced-form and independent.",
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
