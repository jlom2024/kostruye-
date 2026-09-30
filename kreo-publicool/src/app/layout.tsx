import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KREO-PubliCool',
  description: 'Plataforma SaaS para automatización de campañas en redes sociales',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
