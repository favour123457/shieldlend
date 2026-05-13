/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#080a08',
        'green-primary': '#00c44f',
        'green-hover': '#00e85c',
        'green-muted': '#4a7a4a',
        'green-border': '#1a2e1a',
        'text-primary': '#e8f5e8',
        'text-secondary': '#4a7a4a',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
