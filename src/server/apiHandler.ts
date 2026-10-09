/**
 * Server API Handler router.
 * Dispatches POST /api/gemini/advisor and GET /api/weather/forecast.
 */
import { IncomingMessage, ServerResponse } from 'http';
import { askEnergyAdvisor, AdvisorContext } from './geminiAdvisor';
import {
  handleGenerateVideo,
  handleVideoStatus,
  handleVideoDownload,
} from './videoHandler';

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<boolean> {
  if (pathname === '/api/gemini/advisor' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload: AdvisorContext = JSON.parse(body || '{}');
        const reply = await askEnergyAdvisor(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: reply }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid request';
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
    });
    return true;
  }

  if (pathname === '/api/generate-video' && req.method === 'POST') {
    await handleGenerateVideo(req, res);
    return true;
  }

  if (pathname === '/api/video-status' && req.method === 'POST') {
    await handleVideoStatus(req, res);
    return true;
  }

  if (pathname === '/api/video-download' && req.method === 'POST') {
    await handleVideoDownload(req, res);
    return true;
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', localAgentOnline: true }));
    return true;
  }

  return false;
}

