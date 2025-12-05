import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // CRITICAL: Enable class-based dark mode
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
      },
    },
  },
  plugins: [],
};

export default config;
