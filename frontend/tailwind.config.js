/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bank-dark': '#0B0F19',
        'bank-card': '#1C2333',
        'bank-blue': '#2563EB',
        'bank-blue-hover': '#1D4ED8',
        'bank-accent': '#38BDF8',
      }
    },
  },
  plugins: [],
}
