/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",       // ← your App‑Router pages
    "./components/**/*.{js,ts,jsx,tsx}", // ← in case you add components
    "./public/**/*.html"                 // ← any static HTML
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};