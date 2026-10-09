import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import { handleApiRequest } from './src/server/apiHandler';
import { setupLiveWebSocket } from './src/server/liveSession';

function apiServerPlugin(): Plugin {
  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url.startsWith('/api/')) {
          const handled = await handleApiRequest(req, res, url);
          if (handled) return;
        }
        next();
      });

      if (server.httpServer) {
        const wss = new WebSocketServer({ noServer: true });
        server.httpServer.on('upgrade', (request, socket, head) => {
          const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname;
          if (requestPath !== '/live') return;

          wss.handleUpgrade(request, socket, head, (client) => {
            wss.emit('connection', client, request);
          });
        });
        setupLiveWebSocket(wss);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

