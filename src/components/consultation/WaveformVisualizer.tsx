import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
}

/**
 * Small, unobtrusive live audio level meter rendered from the recording
 * MediaStream via the Web Audio AnalyserNode.
 */
export function WaveformVisualizer({ stream, active, className = '' }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !active || typeof window === 'undefined') {
      return;
    }
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const width = canvas.width;
      const height = canvas.height;
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, width, height);
      const barCount = dataArray.length;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i += 1) {
        const value = dataArray[i] / 255;
        const barHeight = Math.max(2, value * height);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(i * barWidth, (height - barHeight) / 2, Math.max(1, barWidth - 1), barHeight);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      source.disconnect();
      void audioContext.close();
      audioContextRef.current = null;
    };
  }, [stream, active]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={28}
      className={`h-7 w-[120px] ${className}`}
      aria-hidden="true"
    />
  );
}
