/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#242421",
          accent: "#D97757",
          bg: "#FAF9F5",
          text: "#141413",
          muted: "#BBB9AF",
          border: "#C2C0B6",
          blue: "#2C84DB",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(20, 20, 19, 0.04), 0 1px 2px -1px rgba(20, 20, 19, 0.04)",
        "card-hover":
          "0 4px 6px -1px rgba(20, 20, 19, 0.06), 0 2px 4px -2px rgba(20, 20, 19, 0.04)",
        modal:
          "0 20px 25px -5px rgba(20, 20, 19, 0.08), 0 8px 10px -6px rgba(20, 20, 19, 0.04)",
      },
    },
  },
  plugins: [],
};
