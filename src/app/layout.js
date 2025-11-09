import { Inter } from "next/font/google";
import "./globals.css";
import "./print.css"; // <-- ENSURE THIS IMPORT IS HERE
import { ClientLayout } from "@/components/ClientLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: {
    default: "ARK POS",
    template: "%s | ARK POS",
  },
  description: "A modern Point of Sale system for ARK Enterprise.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 bg-gray-50">{children}</main>
            </div>
          </ProtectedRoute>
        </ClientLayout>
      </body>
    </html>
  );
}
