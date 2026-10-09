import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Film,
  Play,
  Pause,
  Download,
  Sparkles,
  Layers,
  Info,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sun,
  Video,
} from 'lucide-react';

interface ImageToVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageToVideoModal: React.FC<ImageToVideoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [prompt, setPrompt] = useState(
    'Cinematic golden sunlight streaming onto rooftop solar panels, with radiant shimmering energy flowing smoothly into a modern home battery storage system.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isCanvasPlaying, setIsCanvasPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Sample starter images
  const sampleImages = [
    {
      title: 'Solar Rooftop',
      url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Home Battery',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Power Grid Sunset',
      url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
    },
  ];

  const handleSelectSample = (url: string) => {
    setSelectedImage(url);
    setGeneratedVideoUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setGeneratedVideoUrl(null);
    };
    reader.readAsDataURL(file);
  };

  // Canvas kinetic motion animation loop
  const startCanvasAnimation = useCallback(() => {
    if (!selectedImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedImage;
    imageElementRef.current = img;

    img.onload = () => {
      setIsCanvasPlaying(true);
      let startTime = performance.now();

      const renderFrame = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Smooth cinematic pan and subtle slow zoom
        const scale = 1.05 + 0.08 * Math.sin(elapsed * 0.4);
        const panX = 15 * Math.sin(elapsed * 0.3);
        const panY = 10 * Math.cos(elapsed * 0.3);

        ctx.save();
        ctx.translate(width / 2 + panX, height / 2 + panY);
        ctx.scale(scale, scale);

        // Draw image covering aspect
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let dw, dh;
        if (imgRatio > canvasRatio) {
          dh = height;
          dw = height * imgRatio;
        } else {
          dw = width;
          dh = width / imgRatio;
        }

        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();

        // Shimmering sunlight particle overlay
        const numParticles = 24;
        for (let i = 0; i < numParticles; i++) {
          const px = (width * ((i * 137.5 + elapsed * 40) % width)) / width;
          const py = (height * ((i * 223.7 - elapsed * 25) % height)) / height;
          const radius = 1.5 + Math.sin(elapsed * 2 + i) * 1;
          const opacity = 0.4 + 0.4 * Math.sin(elapsed * 3 + i);

          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, radius), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(253, 224, 71, ${opacity})`;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 6;
          ctx.fill();
        }

        // Soft solar flare sweep
        const flareX = width * (0.3 + 0.4 * Math.sin(elapsed * 0.25));
        const flareY = height * 0.25;
        const flareGrad = ctx.createRadialGradient(flareX, flareY, 10, flareX, flareY, 160);
        flareGrad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
        flareGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.1)');
        flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, 0, width, height);

        animFrameIdRef.current = requestAnimationFrame(renderFrame);
      };

      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    };
  }, [selectedImage]);

  useEffect(() => {
    if (selectedImage) {
      startCanvasAnimation();
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [selectedImage, startCanvasAnimation]);

  // Video recording from Canvas (MediaRecorder)
  const handleRecordCanvasVideo = () => {
    if (!canvasRef.current) return;
    setIsRecording(true);
    recordedChunksRef.current = [];

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      setIsRecording(false);
      setProgressText('Video rendered successfully! Ready to download.');
    };

    recorder.start();
    setProgressText('Rendering 4-second animated video clip...');

    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, 4000);
  };

  // Full Veo API attempt
  const handleGenerateVeoVideo = async () => {
    if (!selectedImage) return;
    setIsGenerating(true);
    setProgressText('Submitting prompt to Veo video generation model...');

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageBase64: selectedImage,
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (data.requiresPaidKey) {
        setProgressText(data.error);
        setIsGenerating(false);
        // Automatically trigger client-side video animation recording so user gets a video!
        handleRecordCanvasVideo();
        return;
      }

      if (data.operationName) {
        setProgressText('Veo operation created. Polling video progress...');
        pollVeoStatus(data.operationName);
      } else {
        handleRecordCanvasVideo();
      }
    } catch {
      handleRecordCanvasVideo();
    } finally {
      setIsGenerating(false);
    }
  };

  const pollVeoStatus = async (operationName: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const status = await res.json();

        if (status.done) {
          clearInterval(interval);
          setProgressText('Downloading generated Veo video...');
          downloadVeoVideo(operationName);
        } else if (attempts > 30) {
          clearInterval(interval);
          setProgressText('Veo operation taking longer than expected. Using local render.');
          handleRecordCanvasVideo();
        } else {
          setProgressText(`Rendering Veo frames (${attempts * 4}s)...`);
        }
      } catch {
        clearInterval(interval);
        handleRecordCanvasVideo();
      }
    }, 4000);
  };

  const downloadVeoVideo = async (operationName: string) => {
    try {
      const res = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      setProgressText('Veo video downloaded successfully!');
    } catch {
      handleRecordCanvasVideo();
    }
  };

  if (!isOpen) return null;

  const canvasWidth = aspectRatio === '16:9' ? 640 : 360;
  const canvasHeight = aspectRatio === '16:9' ? 360 : 640;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] p-6 shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Animate Photo into Video</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Veo Video Engine
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Transform rooftop solar & battery photos into cinematic video clips
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

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-4">
          {/* Left Column: Photo Upload & Parameters */}
          <div className="md:col-span-5 space-y-4 text-xs">
            {/* Upload Box */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">1. Choose Photo to Animate</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-950/60 rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                <span className="text-slate-200 font-medium block">Upload Solar / Household Photo</span>
                <span className="text-[10px] text-slate-500">JPG, PNG, or WebP</span>
              </div>

              {/* Sample Images */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Or use sample:</span>
                {sampleImages.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(s.url)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">2. Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="w-10 h-6 border-2 border-current rounded flex items-center justify-center text-[9px] font-mono">
                    16:9
                  </div>
                  <span>Landscape (16:9)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="w-6 h-10 border-2 border-current rounded flex items-center justify-center text-[9px] font-mono">
                    9:16
                  </div>
                  <span>Portrait (9:16)</span>
                </button>
              </div>
            </div>

            {/* Motion Prompt */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">3. Motion & Animation Prompt</label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe how the photo should animate..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleGenerateVeoVideo}
                disabled={!selectedImage || isGenerating || isRecording}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                {isGenerating || isRecording ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Animated Video...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Animated Video ({aspectRatio})</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRecordCanvasVideo}
                disabled={!selectedImage || isRecording}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick Record Client Video (WebM)</span>
              </button>
            </div>

            {progressText && (
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-cyan-300 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{progressText}</span>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Video Preview & Player */}
          <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
            {!selectedImage ? (
              <div className="text-center p-6 text-slate-500">
                <Film className="w-12 h-12 mx-auto mb-2 opacity-40 text-cyan-400" />
                <p className="text-sm font-medium text-slate-300">No Photo Selected</p>
                <p className="text-xs mt-1">Upload a photo or choose a sample to see motion animation</p>
              </div>
            ) : generatedVideoUrl ? (
              /* Rendered Video Clip */
              <div className="w-full flex flex-col items-center gap-3">
                <div
                  className={`relative rounded-xl overflow-hidden border border-cyan-500/40 shadow-2xl ${
                    aspectRatio === '9:16' ? 'max-w-[280px] aspect-[9/16]' : 'w-full aspect-[16/9]'
                  }`}
                >
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={generatedVideoUrl}
                    download={`solar_animation_${aspectRatio.replace(':', '_')}.webm`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Video Clip</span>
                  </a>
                  <button
                    onClick={() => setGeneratedVideoUrl(null)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    Replay Canvas
                  </button>
                </div>
              </div>
            ) : (
              /* Live Kinetic Canvas Preview */
              <div className="w-full flex flex-col items-center gap-2">
                <div
                  className={`relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-black ${
                    aspectRatio === '9:16' ? 'max-w-[280px] aspect-[9/16]' : 'w-full aspect-[16/9]'
                  }`}
                >
                  <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-cyan-300 font-mono border border-slate-700">
                    Live Motion Canvas ({aspectRatio})
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  Real-time kinetic camera drift & solar flare illumination
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Veo Video Generation & Kinetic Animation Engine</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
