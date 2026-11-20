import type { Config } from "tailwindcss";

/**
 * Charte Capt Production (capt-production.com) :
 * noir profond, blanc, gris (#2b2b2b, #7e8181, #c0c0c0), typo Montserrat.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-montserrat)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Accent de marque : blanc sur noir
        accent: { DEFAULT: "#ffffff", fg: "#000000", hover: "#e6e6e6", soft: "#1f1f1f" },
        chrome: { DEFAULT: "#000000", deep: "#141414", line: "#2b2b2b" },
        canvas: "#0a0a0a",
        surface: { DEFAULT: "#141414", 2: "#1b1b1b", 3: "#232323" },
        stage: "#050505",
        ink: { DEFAULT: "#ffffff", soft: "#d6d6d6", muted: "#9a9d9d", faint: "#6a6d6d" },
        line: { DEFAULT: "#262626", strong: "#363636" },
        field: "#1f1f1f",
      },
      borderRadius: { card: "14px" },
      boxShadow: {
        card: "0 0 0 1px #222222",
        "card-hover": "0 0 0 1px #3a3a3a, 0 12px 32px rgba(0,0,0,0.55)",
        pop: "0 0 0 1px #2e2e2e, 0 16px 40px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { "fade-in": "fade-in 160ms ease-out" },
    },
  },
  plugins: [],
};
export default config;
