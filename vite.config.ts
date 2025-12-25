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
          manualChunks: {
            // React and React Query MUST be together - Query uses React.createContext at init
            'react-vendor': ['react', 'react-dom', '@tanstack/react-query'],
            'web3-vendor': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
            'chart-vendor': ['recharts'],
          }
        }
      },
      chunkSizeWarningLimit: 600,
      sourcemap: false,
      minify: 'esbuild',
    }
  };
});
