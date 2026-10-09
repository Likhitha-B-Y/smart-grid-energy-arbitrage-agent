import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { handleApiRequest } from './src/server/apiHandler.ts';
import { setupLiveWebSocket } from './src/server/liveSession.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API route middleware
app.use(async (req, res, next) => {
  const url = req.url ? req.url.split('?')[0] : '';
  if (url.startsWith('/api/')) {
    const handled = await handleApiRequest(req, res, url);
    if (handled) return;
  }
  next();
});

// Serve static frontend assets from dist in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const httpServer = app.listen(PORT, () => {
  console.log(`Smart Grid Arbitrage Agent server running on port ${PORT}`);
});

const wss = new WebSocketServer({
  server: httpServer,
  path: '/live',
});
setupLiveWebSocket(wss);

