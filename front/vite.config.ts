import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import type { UserConfig } from 'vitest/config';

const vitestConfig: UserConfig['test'] = {
  globals: true,
  environment: 'jsdom',
  setupFiles: 'src/vitest.setup.ts',
};

export default defineConfig(({ mode }) => {
  const frontendUrl = process.env.VITE_FRONTEND_URL;
  const allowedHost = frontendUrl ? new URL(frontendUrl).hostname : 'localhost';
  const proxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://server:3000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      allowedHosts: [allowedHost],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/about.json': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
    test: vitestConfig,
    experimental: {
      enableNativePlugins: 'v1',
    },
  };
});
