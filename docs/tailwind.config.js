/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./script.js"],
  theme: {
    extend: {
      colors: {
        primary: "#005FB8",
        secondary: "#008080",
        accent: "#F59E0B",
        ink: "#0F172A",
        mist: "#EEF3F8",
        paper: "#F8FBFF",
        shell: "#E9F0F7",
        slate: "#5B6878",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 50px -24px rgba(0, 95, 184, 0.28)",
        soft: "0 16px 38px -28px rgba(15, 23, 42, 0.30)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
