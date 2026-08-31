import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    {
      name: 'yunafied-csp',
      transformIndexHtml(html) {
        const connectSrc = mode === 'development'
          ? "'self' http://localhost:4000 http://127.0.0.1:4000 https://www.yunafied.online"
          : "'self' https://www.yunafied.online";

        return html.replace('__CSP_CONNECT_SRC__', connectSrc);
      },
    },
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
