/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // hover: styles only on devices that really hover, so they don't stick after a tap on mobile
  future: { hoverOnlyWhenSupported: true },
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
