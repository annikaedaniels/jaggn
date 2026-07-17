import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  future: {
    // Touch devices fire hover on tap and then STICK in that state until you
    // tap elsewhere — so an orange link stays orange after you scroll away.
    // This compiles every hover: utility behind @media (hover: hover).
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        ink: "#0D0D0D",     // background — near-black
        gray: "#C2C5C1",    // primary text — cool grey
        grayDim: "#7C7F7B", // muted grey (secondary)
        signal: "#FF5A00",  // Channel 7700 orange (the 10% accent)
      },
      fontFamily: {
        // Loaded via next/font in layout and exposed as CSS variables.
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        // The brief's tracking scale. Use these utilities (tracking-nav etc.)
        // rather than inline styles, so the whole site retunes from one place.
        nav: "0.2rem",    // nav, buttons, eyebrows, labels
        label: "0.15rem", // secondary/inline labels
        input: "0.05rem", // form fields — wide tracking hurts typing
      },
      keyframes: {
        flicker: {
          "0%,100%": { opacity: "0.06" },
          "50%": { opacity: "0.11" },
          "20%": { opacity: "0.04" },
          "80%": { opacity: "0.09" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        flicker: "flicker 0.25s steps(3) infinite",
        scan: "scan 7s linear infinite",
        ticker: "ticker 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
