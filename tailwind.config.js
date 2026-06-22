/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette inspirée de Letterboxd
        lb: {
          bg: '#14181c',
          card: '#1c2228',
          border: '#2c343c',
          green: '#00e054',
          blue: '#40bcf4',
          orange: '#ff8000',
          text: '#abc4d4',
          muted: '#678',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
