import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The code base keeps the REACT_APP_* environment convention (process.env.REACT_APP_API_URL), so expose those
// variables (from .env files and the shell) through a `process.env` replacement at build time.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const processEnv = { ...env, NODE_ENV: mode === 'production' ? 'production' : mode };
  return {
    plugins: [react({ include: /\.(js|jsx)$/ })],
    // components live in .js files and contain JSX
    esbuild: { loader: 'jsx', include: /src\/.*\.jsx?$/, exclude: [] },
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
    define: { 'process.env': JSON.stringify(processEnv) },
    server: { port: 3000, open: false },
    preview: { port: 3000 },
    build: {
      outDir: process.env.BUILD_PATH ? path.resolve(process.cwd(), process.env.BUILD_PATH) : 'build',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.js',
      css: false,
      include: ['src/**/*.test.js'],
    },
  };
});
