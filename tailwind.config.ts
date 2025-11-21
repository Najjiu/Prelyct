import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(223, 93%, 59%)', // Prelyct primary blue
          dark: 'hsl(223, 93%, 49%)', // Prelyct primary-700
          light: 'hsl(223, 93%, 69%)', // Prelyct primary-500
          50: 'hsl(223, 93%, 98%)',
          100: 'hsl(223, 93%, 97%)',
          200: 'hsl(223, 93%, 95%)',
          300: 'hsl(223, 93%, 89%)',
          400: 'hsl(223, 93%, 79%)',
          500: 'hsl(223, 93%, 69%)',
          600: 'hsl(223, 93%, 59%)',
          700: 'hsl(223, 93%, 49%)',
        },
      },
    },
  },
  plugins: [],
}
export default config

