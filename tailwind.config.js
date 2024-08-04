/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        customOrange: '#f9531e',
        customCream: '#FCECD3',
        customGreen: '#def2eb',
        textGreen: '#388f6e',
        dotGreen: '#9cd8c2',
      },
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
        ubuntu: ['Ubuntu', 'sans-serif'],
        bodoni: ['Bodoni Moda SC', 'serif'],
        lato: ['Lato', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        playwrite: ['playwrite CU', 'cursive'],
        opensans: ['Open Sans', 'sans-serif'],

      },
    },
  },
  plugins: [],
}
