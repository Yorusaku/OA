/** @type {import('tailwindcss').Config} */
const config = require('@oa/config/tailwind')

module.exports = {
  ...config.default,
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
}
