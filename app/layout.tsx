import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MTG Commander Deck Builder',
  description: 'Build and manage your Magic: The Gathering Commander decks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
