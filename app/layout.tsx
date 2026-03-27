import type { Metadata, Viewport } from "next"
import "./globals.css"
import { QueryProvider } from "@/components/QueryProvider"

export const metadata: Metadata = {
  title: "Acomodate",
  description: "",
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
