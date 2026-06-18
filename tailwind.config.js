/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        dark: {
          900: '#0f1419',
          800: '#1a1f2e',
          700: '#242b3d',
          600: '#2e3650',
          500: '#3d4566',
        },
        accent: {
          blue: '#3b82f6',
          amber: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
        },
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
