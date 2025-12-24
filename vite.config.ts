
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths so it works on any GitHub repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
