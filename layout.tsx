import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "Resumen · Documentos claros en minutos",
    description: "Sube un documento Word o Markdown y obtén un resumen claro, estructurado y privado.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Resumen · Sube el contenido. Quédate con lo esencial.",
      description: "Convierte documentos en resúmenes claros sin sacar el archivo de tu navegador.",
      images: [{ url: new URL("/og-v2.png", base), width: 1536, height: 1024, alt: "Resumen automático de documentos" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Resumen · Sube el contenido. Quédate con lo esencial.",
      description: "Convierte documentos en resúmenes claros sin sacar el archivo de tu navegador.",
      images: [new URL("/og-v2.png", base)],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
