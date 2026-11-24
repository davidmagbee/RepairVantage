import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    // Preserve Origin for authentication, eligibility and GraphQL; API reads must never receive the SPA shell.
    proxy: { '/api/auth': backend, '/api/eligibility': backend, '/graphql': backend },
  },
});
