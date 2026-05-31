import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  clearLabel: string;
  ariaLabel: string;
}

/**
 * Lightweight canvas signature pad for capturing patient consent on a tablet.
 * Emits a PNG data URL whenever the signature changes.
 */
export function SignaturePad({ onChange, clearLabel, ariaLabel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointerPosition(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) {
      setHasInk(true);
    }
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasInk) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={420}
        height={140}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
        className="h-32 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-slate-50"
      />
      <button
        type="button"
        onClick={clear}
        className="text-xs font-semibold text-slate-500 transition hover:text-slate-800"
      >
        {clearLabel}
      </button>
    </div>
  );
}
