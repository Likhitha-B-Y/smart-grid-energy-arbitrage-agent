/**
 * Server-side Gemini Live API WebSocket Bridge.
 * Connects browser WebSocket clients to model 'gemini-3.8-live' for real-time voice conversations.
 */

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          error: 'GEMINI_API_KEY is not configured on the server.',
        })
      );
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction:
            'You are an expert Smart Grid Energy AI Advisor for a homeowner with rooftop solar and battery energy storage. ' +
            'You speak naturally and conversationally about solar generation, battery charging/discharging, peak electricity prices, and energy cost optimization. ' +
            'Keep your responses direct, helpful, and concise.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audioData =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              clientWs.send(JSON.stringify({ audio: audioData }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: any) => {
            console.error('Gemini Live session error:', err);
            clientWs.send(
              JSON.stringify({
                error: err?.message || 'Gemini Live session encountered an error',
              })
            );
          },
          onclose: () => {
            clientWs.send(JSON.stringify({ closed: true }));
          },
        },
      });

      // Handle incoming messages from the browser
      clientWs.on('message', (rawData) => {
        try {
          const payload = JSON.parse(rawData.toString());
          if (payload.audio) {
            // Raw 16kHz PCM audio
            session.sendRealtimeInput({
              audio: {
                data: payload.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (payload.text) {
            session.sendRealtimeInput({
              text: payload.text,
            });
          }
        } catch (e) {
          console.error('Error handling client live message:', e);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch (e) {
          // ignore cleanup errors
        }
      });
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live API:', err);
      clientWs.send(
        JSON.stringify({
          error:
            err?.message ||
            'Could not initialize gemini-3.8-live session. Check API key configuration.',
        })
      );
      clientWs.close();
    }
  });
}
