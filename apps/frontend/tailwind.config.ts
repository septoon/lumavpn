import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        muted: '#5b6472',
        line: '#d9e2ec',
        cyan: '#00a9c7'
      }
    }
  },
  plugins: []
};

export default config;
