import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          // Only separate truly independent libs, let Vite handle React ecosystem
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // viem is pure TypeScript with no React - safe to separate
              if (id.includes('viem') && !id.includes('wagmi')) {
                return 'viem';
              }
            }
            // Let Vite/Rollup handle everything else automatically
          }
        }
      },
      chunkSizeWarningLimit: 2000, // Larger bundles are fine for now
      sourcemap: false,
      minify: 'esbuild',
    }
  };
});
