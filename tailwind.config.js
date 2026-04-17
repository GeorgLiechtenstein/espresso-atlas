/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coffee: '#6F4E37',
        ink:    '#1A1A1A',
        surface:'#F7F7F8',
        border: '#E5E5E7',
        score: {
          red:   '#E53935',
          amber: '#FFC107',
          green: '#43A047',
          gold:  '#F59E0B',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
