/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: '#0F1117', secondary: '#181B25', card: '#1E2230', elevated: '#2A2F42' },
        border: { DEFAULT: '#2E3448', light: '#383E54' },
        accent: { DEFAULT: '#4F7CFF', light: '#6B91FF' },
      },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Playfair Display', 'serif'] },
    },
  },
  plugins: [],
};
