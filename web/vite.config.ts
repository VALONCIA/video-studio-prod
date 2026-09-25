import { fileURLToPath, URL } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { parsePublicEnv } from './src/core/config/env.ts';

export default defineConfig(({ mode, command }) => {
  parsePublicEnv(loadEnv(mode, process.cwd(), 'VITE_'), command === 'build');

  return {
    css: { postcss: {} },
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  };
});
