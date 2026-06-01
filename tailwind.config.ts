import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mtg: {
          gold: '#c8a951',
          bronze: '#9d6b2e',
          dark: '#0f0f1a',
          panel: '#1a1a2e',
          card: '#1e2035',
          parchment: '#e8e0d0',
        },
      },
    },
  },
  plugins: [],
};

export default config;
