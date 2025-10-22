/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 15px 35px rgba(22, 77, 180, 0.15)',
        button: '0 12px 25px rgba(37, 99, 235, 0.25)',
        buttonActive: '0 8px 18px rgba(37, 99, 235, 0.2)',
        buttonMuted: '0 10px 16px rgba(15, 23, 42, 0.15)',
      },
    },
  },
  plugins: [],
};
