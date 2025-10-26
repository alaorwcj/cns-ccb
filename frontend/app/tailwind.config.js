/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", md: "1.5rem", lg: "2rem" } },
    extend: {
      fontSize: {
        fluid: "clamp(1rem, 2.2vw, 1.125rem)",         // corpo
        fluidTitle: "clamp(1.25rem, 2.5vw, 2rem)",     // títulos
      },
    },
  },
  plugins: [],
}
