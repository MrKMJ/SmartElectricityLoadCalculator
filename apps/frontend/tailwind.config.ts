import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9f1",
          100: "#d7f0dc",
          500: "#1f9d55",
          600: "#18813f",
          700: "#146633",
        },
      },
    },
  },
  plugins: [],
};

export default config;
