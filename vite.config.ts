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
          // Use function-based chunking to ensure proper dependency ordering
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Keep React and ALL React-dependent libs together to prevent createContext issues
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('@tanstack/react-query') ||
                id.includes('wagmi') ||
                id.includes('@rainbow-me/rainbowkit')
              ) {
                return 'framework';
              }
              // Separate heavy non-React libs
              if (id.includes('viem')) {
                return 'viem';
              }
              if (id.includes('recharts')) {
                return 'charts';
              }
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000, // Increase limit since we're bundling more together
      sourcemap: false,
      minify: 'esbuild',
    }
  };
});
