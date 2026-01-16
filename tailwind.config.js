/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ember: {
          DEFAULT: '#BF560D',
          hover: '#9E470B',
          light: '#DE640F',
        },
        taupe: {
          grey: '#62544F',
          DEFAULT: '#554238',
        },
        khaki: {
          beige: '#C2AE97',
        },
        gunmetal: {
          DEFAULT: '#343738',
        }
      }
    },
  },
  plugins: [],
}
