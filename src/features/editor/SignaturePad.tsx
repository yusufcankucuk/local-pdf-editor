import { useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

export function SignaturePad({
  onUse,
}: {
  onUse: (data: string, ratio: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [drawn, setDrawn] = useState(false);
  return (
    <div className="signature-pad">
      <canvas
        ref={ref}
        width={600}
        height={220}
        aria-label="İmzanızı çizmek için alan"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          last.current = {
            x: ((event.clientX - rect.left) * 600) / rect.width,
            y: ((event.clientY - rect.top) * 220) / rect.height,
          };
        }}
        onPointerMove={(event) => {
          if (!last.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const next = {
            x: ((event.clientX - rect.left) * 600) / rect.width,
            y: ((event.clientY - rect.top) * 220) / rect.height,
          };
          const context = event.currentTarget.getContext("2d");
          if (context) {
            context.strokeStyle = "#29324b";
            context.lineWidth = 3;
            context.lineCap = "round";
            context.beginPath();
            context.moveTo(last.current.x, last.current.y);
            context.lineTo(next.x, next.y);
            context.stroke();
            setDrawn(true);
          }
          last.current = next;
        }}
        onPointerUp={() => {
          last.current = null;
        }}
        onPointerCancel={() => {
          last.current = null;
        }}
      />
      <div>
        <button
          className="text-button"
          onClick={() => {
            ref.current?.getContext("2d")?.clearRect(0, 0, 600, 220);
            setDrawn(false);
          }}
        >
          <RotateCcw size={14} />
          Temizle
        </button>
        <button
          className="button button-light"
          disabled={!drawn}
          onClick={() => {
            if (ref.current)
              onUse(ref.current.toDataURL("image/png"), 600 / 220);
          }}
        >
          <Check size={14} />
          İmzayı kullan
        </button>
      </div>
    </div>
  );
}
