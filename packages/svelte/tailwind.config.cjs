module.exports = {
  content: [
    './index.html',
    './src/**/*.{svelte,js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      'sans': ['Avenir', 'Fira Sans', 'Arial', 'sans-serif'],
      'serif': ['Alegreya', 'Cambria', 'serif'],
    },
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      'xxl': '1700px',
    },
  },
  plugins: [],
};
