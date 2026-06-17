import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";

const APP_URL = "https://konstruye.site";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "KOSTRUYE+",
    template: "%s | KOSTRUYE+",
  },
  description:
    "ERP de gestión de obras para constructoras del Perú. Presupuesto S10, valorizaciones, planilla, almacén, compras y Last Planner en una sola plataforma.",
  keywords: [
    "software constructoras peru",
    "ERP construccion peru",
    "gestion de obras peru",
    "presupuesto S10",
    "valorizaciones construccion",
    "planilla obreros construccion",
    "last planner system peru",
    "software obra peru",
    "kostruye",
  ],
  authors: [{ name: "KREO IA Studio", url: APP_URL }],
  creator: "KREO IA Studio",
  publisher: "KREO IA Studio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: APP_URL,
    siteName: "Kostruye+",
    title: "KOSTRUYE+",
    description:
      "Gestiona presupuestos, valorizaciones, almacén, planilla y compras de todas tus obras desde una sola plataforma. Hecho en Perú para el sector construcción.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kostruye+ — ERP para constructoras peruanas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KOSTRUYE+",
    description:
      "ERP de gestión de obras para constructoras del Perú. Presupuesto, valorizaciones, almacén, planilla y más.",
    images: ["/og-image.png"],
    creator: "@kreoia_studio",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  alternates: {
    canonical: APP_URL,
  },
  verification: {
    google: "YznhFBzkOtji68yPoDtZPgFYD9wv-kYNl4fuFyhFH8I",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
