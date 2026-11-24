import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    // Preserve the browser Origin for Better Auth and GraphQL CSRF validation.
    proxy: { '/api/auth': backend, '/graphql': backend },
  },
});
