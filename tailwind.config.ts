import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#e8edf5",
          100: "#c5d0e6",
          200: "#9fb0d5",
          300: "#7990c4",
          400: "#5c78b8",
          500: "#3f60ab",
          600: "#2d4d95",
          700: "#1e3a7a",
          800: "#132860",
          900: "#0a1a45",
          950: "#060f2a",
        },
        charcoal: {
          50: "#f2f2f3",
          100: "#dddde0",
          200: "#c5c6ca",
          300: "#a9aab0",
          400: "#92939b",
          500: "#7a7c86",
          600: "#636570",
          700: "#4d4f59",
          800: "#363843",
          900: "#22242e",
          950: "#141520",
        },
        sand: {
          50: "#fdf9f0",
          100: "#f9f0d8",
          200: "#f3e2b0",
          300: "#ebce82",
          400: "#e2b852",
          500: "#d9a32a",
          600: "#b8831e",
          700: "#906418",
          800: "#6a4a12",
          900: "#47320c",
        },
        military: {
          50: "#f0f3ec",
          100: "#d8e0cf",
          200: "#b8c8ab",
          300: "#94ad82",
          400: "#739660",
          500: "#557d42",
          600: "#426430",
          700: "#314b22",
          800: "#213216",
          900: "#131d0c",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern":
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
