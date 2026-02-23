import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ScienceLingo — Level up your science game",
  description:
    "Weekly science reviews that feel like a game. Earn XP, build streaks, compete on the leaderboard, and get help from an AI tutor — all in 10 questions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-[#060c18]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#060c18] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
