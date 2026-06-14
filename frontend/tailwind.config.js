/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          black: '#000000',
          surface: '#1C1C1E',
          surfaceHover: '#2C2C2E',
          blue: '#0A84FF',
          green: '#32D74B',
          red: '#FF453A',
          gray: '#8E8E93',
          lightText: '#F2F2F7',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          'Helvetica', 
          'Arial', 
          'sans-serif'
        ],
      }
    },
  },
  plugins: [],
}