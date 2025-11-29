import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/test/', // Sets the base path for GitHub Pages deployment
  define: {
    // Polyfill process.env to prevent runtime crashes when accessing API_KEY
    'process.env': {}
  }
});