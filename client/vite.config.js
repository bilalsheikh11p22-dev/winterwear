import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite 8 uses rolldown which requires manualChunks as a function
// Reference: https://vite.dev/config/build-options#build-rollupoptions
const VENDOR_CHUNKS = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-gsap': ['gsap'],
  'vendor-lenis': ['lenis'],
  'vendor-framer': ['framer-motion'],
  'vendor-recharts': ['recharts'],
  'vendor-icons': ['lucide-react'],
  'vendor-axios': ['axios'],
};

function manualChunks(id) {
  for (const [chunkName, modules] of Object.entries(VENDOR_CHUNKS)) {
    if (modules.some((mod) => id.includes(`/node_modules/${mod}/`))) {
      return chunkName;
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Warn when individual chunks exceed 1 MB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
