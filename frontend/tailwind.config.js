/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#04091a",
          900: "#060d1f",
          800: "#0b1530",
          700: "#102040",
          600: "#1a3060",
        },
        royal: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e3a8a",
        },
        gold: {
          400: "#f4c542",
          500: "#d4a017",
          600: "#a47d10",
        },
        ivory: "#f7f3e8",
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
