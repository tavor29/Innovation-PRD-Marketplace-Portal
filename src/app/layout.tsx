import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "פורטל חדשנות ו-PRD Marketplace",
  description: "הגשת רעיונות, PRD עם בדיקת מדיניות, ו-marketplace לתעדוף והקצאה. דמו עם נתונים סינתטיים.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
