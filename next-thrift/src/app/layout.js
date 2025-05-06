// src/app/layout.jsx
import { Roboto, Ubuntu, Lato, Poppins, Open_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/custom-hooks/useAuth";
import { FavoritesProvider } from "@/components/context/FavoritesContext";
import { Toaster } from "react-hot-toast";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-roboto",
});
const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
});
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-poppins",
});
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-opensans",
});

export const metadata = {
  title: "My Thrift Blog",
  description:
    "Tap into our world—insider tips, smart thrift shopping guides, exclusive drops, product updates, and more.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "My Thrift Blog",
    description:
      "Tap into our world—insider tips, smart thrift shopping guides, exclusive drops, product updates, and more.",
    url: "https://blog.shopmythrift.store/",
    images: [
      {
        url: "https://blog.shopmythrift.store/Logo-og.png",
        width: 1200,
        height: 630,
        alt: "My Thrift Blog",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Thrift Blog",
    description:
      "Tap into our world—insider tips, smart thrift shopping guides, exclusive drops, product updates, and more.",
    images: ["https://blog.shopmythrift.store/Logo-og.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${roboto.variable} ${ubuntu.variable} ${lato.variable} ${poppins.variable} ${openSans.variable} antialiased`}>
      <body>
        {/* global toasts */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 2000,
            style: {
              minWidth: "220px",
              fontSize: "12px",
              padding: "10px 20px",
              fontFamily: "Poppins, sans-serif",
            },
          }}
        />

        {/* your global providers */}
        <FavoritesProvider>
          <AuthProvider>{children}</AuthProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
