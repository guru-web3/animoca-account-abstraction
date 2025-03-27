// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/providers/ToastContex";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Biconomy AA Demo",
  description: "Account Abstraction demo using Biconomy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen bg-gray-900">
          <ToastProvider>
            <main className="flex-grow">{children}</main>
          </ToastProvider>
          <footer className="bg-gray-800 py-4 w-full mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-400">
                Powered by Biconomy Account Abstraction
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
