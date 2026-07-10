/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Direction "ciné-club éditorial" : charbon chaud + texte crème,
        // le trio de couleurs Letterboxd en accents (A=vert, B=bleu, commun=orange).
        night: '#0c0e11', // fond de page
        well: '#101318', // panneaux profonds
        card: '#161a20', // cartes
        line: '#272d36', // bordures
        ink: '#e9e2d3', // texte principal (crème chaud)
        mut: '#98938a', // texte secondaire
        faint: '#807b6f', // indices, mentions légales (≥ 4:1 sur card)
        green: '#00e054', // profil A (accent vif — texte/traits)
        blue: '#40bcf4', // profil B
        orange: '#ff8000', // ce qui est partagé
        // Variantes assombries pour les APLATS de graphiques — palette validée
        // (bande de luminosité, ΔE daltonisme, contraste) via le validateur dataviz.
        greenfill: '#00a83f',
        bluefill: '#2b93c6',
        orangefill: '#cc6600',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Archivo', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
