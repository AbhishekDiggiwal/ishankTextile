import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ishank Textile - Premium Fabric Manufacturing Since 2003',
  description: 'Leading manufacturer of Vat-Dyed & Fiber-Dyed fabrics for defense, medical, corporate and hospitality sectors. Quality textiles with molecular-level color integrity.',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png', sizes: '64x64' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
