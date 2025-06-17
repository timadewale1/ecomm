/** @type {import('tailwindcss').Config} */
export default {
  mode: "jit",
  content: [
    "./index.html", // Add this!
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        preSm: "380px",
      },
      borderRadius: {
        "2.5xl": "20px",
      },
      width: {
        custVCard: "40vw",
      },
      height: {
        actualScreenHeight: "calc(var(--vh) * 100)",
        c120: "120px",
      },
      colors: {
        lighOrange: "#F9DCD6",
        customGrey: "#FAFAFA",
        customOrange: "#f9531e",
        lightOrange: "#FFF7F2",
        lightBlue: "#F5F4FE",
        customSoftGray: "#fafafa",
        customDeepOrange: "#DA3A00",
        customCream: "#FCECD3",
        customBrown: "#BE7159",
        customRichBrown: "#3E0C00",
        customGreen: "#def2eb",
        lightGreen: "#F2FEF2",
        customPink: "#fEE4E1",
        lightPurple: "#F9F4FF",
        textGreen: "#388f6e",
        dotGreen: "#9cd8c2",
        header: "#3E0C00",
      },
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
        ubuntu: ["Ubuntu", "sans-serif"],
        bodoni: ["Bodoni Moda SC", "serif"],
        lato: ["Lato", "sans-serif"],
        satoshi: ["Satoshi", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
        playwrite: ["playwrite CU", "cursive"],
        opensans: ["Open Sans", "sans-serif"],
      },
      "modal-slide-up": {
        "0%": { transform: "translateY(100%)" },
        "100%": { transform: "translateY(0)" },
      },
      animation: {
        "modal-slide-up": "modal-slide-up 4s ease-out",
      },
    },
  },
  plugins: [],
};
