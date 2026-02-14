import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, (process as any).cwd(), '');
    return {
      base: './', // Changed from '/' to './' for relative path resolution
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'global': 'globalThis',
        'process.env': {
          API_KEY: JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || ''),
          GEMINI_API_KEY: JSON.stringify(env.GEMINI_API_KEY || ''),
          NODE_ENV: JSON.stringify(mode)
        }
      },
      // Ensure build target handles top-level await if needed, though mostly standard
      build: {
        target: 'esnext'
      }
    };
});