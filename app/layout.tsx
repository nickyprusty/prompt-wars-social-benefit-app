import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Emergency Intake Copilot',
  description: 'AI-powered initial medical triage and guidance.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        {children}
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-amber-400 text-amber-950 text-center text-sm font-bold border-t border-amber-500 z-50">
          ⚠️ NOT A DOCTOR. FOR EMERGENCY MOCKUP PURPOSES ONLY. IF THIS IS A REAL EMERGENCY, CALL 911 IMMEDIATELY.
        </footer>
      </body>
    </html>
  )
}
