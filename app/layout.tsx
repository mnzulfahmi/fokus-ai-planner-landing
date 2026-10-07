import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fokus - Your next moves",
  description:
    "A frontend prototype for prioritizing tasks, understanding tradeoffs, and setting reminders.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{const theme=localStorage.getItem('fokus-theme');if(theme==='light'||theme==='dark'){document.documentElement.dataset.theme=theme}}catch{}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
