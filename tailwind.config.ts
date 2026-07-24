import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050e1c',
          900: '#0b1d3a',
          800: '#102447',
          700: '#163259',
          600: '#1d4270',
          500: '#265285',
          400: '#3a6a9e',
          300: '#5a87b8',
          200: '#8baed0',
          100: '#c2d5e8',
          50:  '#e8f0f8',
        },
        ivory: {
          DEFAULT: '#f8f4ed',
          50: '#fdfcf9',
          200: '#ede5d4',
        },
        silver: {
          DEFAULT: '#b8c4d0',
          light: '#d4dce6',
          dark:  '#8b9aaa',
        },
        teal: {
          DEFAULT: '#2d7d7d',
          50:  '#e6f5f5',
          100: '#c0e6e6',
          200: '#8dcece',
          300: '#5ab6b6',
          400: '#3a9f9f',
          500: '#2d8888',
          600: '#267272',
          700: '#1f5f5f',
          800: '#17474a',
        },
        brass: {
          DEFAULT: '#9a7840',
          light: '#b89560',
          dark:  '#7a5e30',
        },
        brand: {
          50:  '#eef9ff',
          100: '#d8f1ff',
          200: '#b9e7ff',
          300: '#87d8ff',
          400: '#4dc0fd',
          500: '#22a6f4',
          600: '#0a87e9',
          700: '#0b6fd6',
          800: '#0f58ad',
          900: '#134b8a',
          950: '#0e2f56',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;