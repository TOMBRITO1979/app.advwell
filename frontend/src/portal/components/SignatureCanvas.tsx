import { useRef, useEffect, useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function SignatureCanvas({ onSave, onCancel, loading = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // For retina displays
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing styles
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Assinar Documento</h2>
          <p className="text-sm text-gray-500 mt-1">
            Use o dedo ou mouse para desenhar sua assinatura
          </p>
        </div>

        <div className="p-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-48 touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Desenhe sua assinatura no campo acima
          </p>
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={clearCanvas}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={18} />
            Limpar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={saveSignature}
            disabled={!hasDrawn || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={18} />
            )}
            Assinar
          </button>
        </div>
      </div>
    </div>
  );
}
