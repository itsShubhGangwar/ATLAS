/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        workbench: {
          bg: "#0B0B0D",
          canvas: "#0B0B0D",
          panel: "#111113",
          "panel-alt": "#161619",
          "panel-hover": "#1C1C20",
          border: "#29292D",
          "border-subtle": "#202024",
          "border-focus": "#C98A3D",
          text: {
            primary: "#D8D8DC",
            secondary: "#77777D",
            muted: "#5A5A62",
            dim: "#3E3E46",
          },
          accent: {
            DEFAULT: "#C98A3D",
            hover: "#DCA052",
            muted: "rgba(201, 138, 61, 0.12)",
            red: "#E06C75",
            "red-muted": "rgba(224, 108, 117, 0.1)",
          },
        },
      },
    },
  },
  plugins: [],
}

