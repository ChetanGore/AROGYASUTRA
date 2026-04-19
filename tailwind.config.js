/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ayur: {
          leaf: "#1b4332",
          moss: "#2d6a4f",
          sand: "#e8dcc8",
          clay: "#c9b8a6",
        },
      },
    },
  },
  plugins: [],
};
