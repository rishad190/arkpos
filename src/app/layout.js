import { Geist } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar"; // Add this import

const geist = Geist({
  subsets: ["latin"],
});

// Add metadata configuration
export const metadata = {
  title: {
    default: "ARK ENTERPRISE",
    template: "%s | POS System",
  },
  description:
    "A modern Point of Sale system for managing customers and transactions",
  keywords: ["POS", "point of sale", "customer management", "transactions"],
  authors: [{ name: "Md Rishad Khan" }],

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={geist.className}>
      <body>
        <ClientLayout>
          <ProtectedRoute>
            <div
              className="flex flex-col min-h-screen"
              data-dialog-root
              inert={false} // Explicitly set inert to false to ensure focus management works
              role="region"
              aria-label="Main application"
            >
              <Navbar />
              <main className="flex-1" role="main">
                {children}
              </main>
            </div>
          </ProtectedRoute>
        </ClientLayout>
      </body>
    </html>
  );
}
