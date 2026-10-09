/**
 * Server-side Video Generation Handler using Google Veo models.
 * Implements the 3-step POST pattern: Start, Poll, and Download.
 */

import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { IncomingMessage, ServerResponse } from 'http';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function handleGenerateVideo(req: IncomingMessage, res: ServerResponse) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const { prompt, imageBase64, mimeType, aspectRatio } = JSON.parse(body || '{}');

      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Prompt is required for video generation.' }));
        return;
      }

      const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
      const ai = getAiClient();

      // Model: veo-3.1-generate-preview or veo-3.1-lite-generate-preview
      const config: any = {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: validAspect,
      };

      const payload: any = {
        model: 'veo-3.1-generate-preview',
        prompt,
        config,
      };

      if (imageBase64) {
        payload.image = {
          imageBytes: imageBase64.replace(/^data:[^;]+;base64,/, ''),
          mimeType: mimeType || 'image/jpeg',
        };
      }

      const operation = await ai.models.generateVideos(payload);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ operationName: operation.name }));
    } catch (err: any) {
      console.error('Generate video error:', err);
      const isPaidKeyError =
        err?.message?.includes('BILLING_DISABLED') ||
        err?.message?.includes('Quota exceeded') ||
        err?.message?.includes('403') ||
        err?.message?.includes('tier');

      const userMessage = isPaidKeyError
        ? 'Veo video generation requires a paid Google AI Studio API key. You can attach a paid key in Settings > Secrets.'
        : err?.message || 'Failed to start video generation.';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          requiresPaidKey: isPaidKeyError,
          error: userMessage,
        })
      );
    }
  });
}

export async function handleVideoStatus(req: IncomingMessage, res: ServerResponse) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const { operationName } = JSON.parse(body || '{}');
      if (!operationName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'operationName is required.' }));
        return;
      }

      const ai = getAiClient();
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ done: updated.done }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err?.message || 'Failed to check status.' }));
    }
  });
}

export async function handleVideoDownload(req: IncomingMessage, res: ServerResponse) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const { operationName } = JSON.parse(body || '{}');
      const apiKey = process.env.GEMINI_API_KEY;
      if (!operationName || !apiKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing operationName or API key.' }));
        return;
      }

      const ai = getAiClient();
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

      if (!uri) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Video URI not found or video still processing.' }));
        return;
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': apiKey },
      });

      res.writeHead(200, { 'Content-Type': 'video/mp4' });
      const arrayBuffer = await videoRes.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err?.message || 'Failed to download video.' }));
    }
  });
}
