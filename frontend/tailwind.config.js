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
        card: "0 1px 2px 0 rgba(20, 20, 19, 0.03), 0 1px 3px 0 rgba(20, 20, 19, 0.05)",
        "card-hover":
          "0 4px 12px -2px rgba(20, 20, 19, 0.08), 0 2px 4px -2px rgba(20, 20, 19, 0.04)",
        "card-active":
          "0 8px 24px -4px rgba(20, 20, 19, 0.1), 0 4px 8px -4px rgba(20, 20, 19, 0.06)",
        modal:
          "0 24px 48px -12px rgba(20, 20, 19, 0.12), 0 8px 16px -8px rgba(20, 20, 19, 0.06)",
        glow: "0 0 0 3px rgba(44, 132, 219, 0.1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-scale": "fade-in-scale 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [],
};
