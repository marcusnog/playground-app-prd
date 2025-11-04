import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
      onwarn(warning, warn) {
        // Ignorar warnings de tipo durante o build
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
        warn(warning)
      },
    },
  },
  optimizeDeps: {
    include: ['recharts'],
  },
  esbuild: {
    // Ignorar erros de tipo durante o build para produção
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  // Desabilitar verificação de tipos durante o build
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
})
