import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Zap,
  Bot,
  User,
  Info,
  RefreshCw,
} from 'lucide-react';
import { HourlyEnergyPoint } from '../types/energy';

interface LiveVoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoint: HourlyEnergyPoint;
}

export const LiveVoiceConversationModal: React.FC<LiveVoiceConversationModalProps> = ({
  isOpen,
  onClose,
  currentPoint,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting to gemini-3.8-live...');
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<
    { sender: 'user' | 'agent'; text: string; time: string }[]
  >([
    {
      sender: 'agent',
      text: `Hello! I am connected via gemini-3.8-live. Your battery is at ${currentPoint.agent.batterySocPct.toFixed(
        0
      )}% SOC and the current tariff is $${currentPoint.importPrice.toFixed(2)}/kWh. Speak into your microphone to discuss your energy dispatch!`,
      time: 'Ready',
    },
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);

  isMutedRef.current = isMuted;

  // Helper: Convert Float32Array to 16-bit PCM Base64
  const pcmToBase64 = (channelData: Float32Array): string => {
    const pcm16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper: Play 24kHz raw PCM chunk
  const playAudioChunk = useCallback((outputCtx: AudioContext, base64Data: string) => {
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = outputCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = outputCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputCtx.destination);

      const currentTime = outputCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      setIsModelSpeaking(true);

      source.onended = () => {
        if (outputCtx.currentTime >= nextStartTimeRef.current - 0.05) {
          setIsModelSpeaking(false);
        }
      };
    } catch (err) {
      console.error('Audio chunk playback error:', err);
    }
  }, []);

  const connectLive = useCallback(async () => {
    try {
      setStatusMessage('Initializing Live API session (gemini-3.8-live)...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Output context for model audio at 24kHz
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatusMessage('Live API connected • Listening for voice...');

        // Start microphone capture at 16kHz
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          streamRef.current = stream;

          const inputCtx = new AudioCtx({ sampleRate: 16000 });
          inputAudioCtxRef.current = inputCtx;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (isMutedRef.current || ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);

            // Compute volume level for visualizer
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            setAudioLevel(Math.min(100, Math.round(rms * 400)));

            const base64Audio = pcmToBase64(inputData);
            ws.send(JSON.stringify({ audio: base64Audio }));
          };
        } catch (micErr) {
          console.warn('Microphone access denied or error:', micErr);
          setStatusMessage('Microphone access denied. You can type in the prompt below.');
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setStatusMessage(`Notice: ${msg.error}`);
          }
          if (msg.audio) {
            playAudioChunk(outputCtx, msg.audio);
          }
          if (msg.interrupted) {
            nextStartTimeRef.current = outputCtx.currentTime;
            setIsModelSpeaking(false);
          }
        } catch (e) {
          console.error('Error handling message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('Live WebSocket error:', e);
        setStatusMessage('WebSocket connection error. Retrying or check server.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatusMessage('Live session disconnected.');
      };
    } catch (err: any) {
      console.error('Live connect failed:', err);
      setStatusMessage(`Connection failed: ${err?.message || 'Check network'}`);
    }
  }, [playAudioChunk]);

  const disconnectLive = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    setIsConnected(false);
    setIsModelSpeaking(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      connectLive();
    } else {
      disconnectLive();
    }
    return () => {
      disconnectLive();
    };
  }, [isOpen, connectLive, disconnectLive]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Glow ambient circle */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <Radio className={`w-5 h-5 ${isConnected ? 'animate-pulse text-emerald-300' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Live Voice Conversation</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  gemini-3.8-live
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Low-latency bidirectional audio streaming
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status and Pulse Visualizer */}
        <div className="py-6 flex flex-col items-center justify-center text-center relative z-10">
          {/* Animated Audio Orb */}
          <div className="relative flex items-center justify-center my-4">
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                isModelSpeaking
                  ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-xl shadow-emerald-500/30 scale-105'
                  : isConnected
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            >
              {isModelSpeaking ? (
                <Volume2 className="w-10 h-10 text-slate-950 animate-bounce" />
              ) : isMuted ? (
                <MicOff className="w-10 h-10 text-slate-400" />
              ) : (
                <Mic className="w-10 h-10 text-white animate-pulse" />
              )}
            </div>

            {/* Pulsing rings when speaking or active */}
            {isConnected && !isMuted && (
              <div
                className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping pointer-events-none"
                style={{ animationDuration: '2s' }}
              />
            )}
          </div>

          {/* Status Message */}
          <div className="text-sm font-semibold text-white mt-1">
            {isModelSpeaking
              ? 'Gemini is speaking...'
              : isConnected
              ? isMuted
                ? 'Microphone Muted'
                : 'Listening to your voice...'
              : 'Connecting...'}
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-sm px-4">
            {statusMessage}
          </p>

          {/* Live Waveform meter */}
          <div className="flex items-center gap-1 mt-4 h-6">
            {[...Array(16)].map((_, i) => {
              const height = isModelSpeaking
                ? Math.sin((i / 16) * Math.PI) * 20 + Math.random() * 6
                : audioLevel > 5
                ? Math.max(4, (audioLevel / 100) * 24 * Math.sin((i / 16) * Math.PI))
                : 4;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isModelSpeaking ? 'bg-cyan-400' : isConnected ? 'bg-emerald-400' : 'bg-slate-700'
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs relative z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
            </button>

            <button
              onClick={() => {
                disconnectLive();
                connectLive();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Reconnect Session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reconnect</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Output: <strong className="text-emerald-400">24kHz PCM</strong>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-3 text-[11px] text-slate-500 flex items-start gap-1.5 relative z-10">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Powered by <strong>gemini-3.8-live</strong> via bidirectional WebSocket. Ask questions like:
            <em> "Should I charge from the grid tonight?"</em> or <em>"How does high battery cycling affect my lifespan?"</em>
          </span>
        </div>
      </div>
    </div>
  );
};
