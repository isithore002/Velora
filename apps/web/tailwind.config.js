/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "v-base": "#000000",
        "v-surface": "#000000",
        "v-elevated": "#000000",
        "v-border": "#166534", // green-800
        "v-text": "#4ade80", // green-400
        "v-text-secondary": "#22c55e", // green-500
        "v-safe": "#4ade80",
        "v-warn": "#facc15",
        "v-danger": "#ef4444",
        "v-info": "#06b6d4",
        "v-accent": "#22c55e",
        "v-cyan": "#06b6d4",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
