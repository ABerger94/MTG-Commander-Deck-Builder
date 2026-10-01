import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MTG Commander Deck Builder',
    short_name: 'MTG Decks',
    description: 'Build Commander decks, generate AI deck briefings, and explore Magic: The Gathering sets.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f1a',
    theme_color: '#0f0f1a',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
    ],
  };
}
