import type { Metadata } from 'next';
import '../styles/generated.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhisperPost | Anonymous Message Relay',
  description: 'Send thoughtful messages through a simple anonymous email relay.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className="dark" lang="en">
      <body>{children}</body>
    </html>
  );
}
