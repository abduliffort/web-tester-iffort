import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/page-components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
      },
      colors: {
        darkPrimary: "#0D0F26",
        darkSecondary: "#4FAEAF",
        darkYellow: "#F3B746",
        darkBlue: "#3F414D",
        darkPink: "#CC237E",
        darkRed: "#FA7575",
        darkBlack: "#3F414D",
      },
      fontSize: {
        size1: [
          "clamp(18px, 2vw, 20px)",
          { lineHeight: "1.3", fontWeight: "600" },
        ],
        size2: [
          "clamp(14px, 1.8vw, 16px)",
          { lineHeight: "1.3", fontWeight: "600" },
        ],
        size3: [
          "clamp(12px, 1.6vw, 14px)",
          { lineHeight: "1.3", fontWeight: "500" },
        ],
        size4: [
          "clamp(10px, 1.4vw, 12px)",
          { lineHeight: "1.3", fontWeight: "500" },
        ],
        size5: [
          "clamp(8px, 1.2vw, 10px)",
          { lineHeight: "1.3", fontWeight: "500" },
        ],
      },
    },
  },
  plugins: [],
};

export default config;
