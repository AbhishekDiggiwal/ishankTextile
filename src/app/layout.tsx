import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ishank Textile - Premium Fabric Manufacturing Since 2003',
  description: 'Leading manufacturer of Vat-Dyed & Fiber-Dyed fabrics for defense, medical, corporate and hospitality sectors. Quality textiles with molecular-level color integrity.',
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
