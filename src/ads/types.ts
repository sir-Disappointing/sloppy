export interface Minigame {
  // Resolves true on a win, false on a fail.
  result: Promise<boolean>;
  destroy(): void;
}

export type MinigameFactory = (host: HTMLElement, difficulty: number) => Minigame;

// A canvas sized for portrait play that scales to fit its host.
export function makeCanvas(host: HTMLElement, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.className = 'ad-canvas';
  canvas.style.aspectRatio = `${w} / ${h}`;
  canvas.getContext('2d')!.scale(dpr, dpr);
  host.appendChild(canvas);
  return canvas;
}

// Pointer position in canvas coordinates.
export function canvasPoint(canvas: HTMLCanvasElement, w: number, e: PointerEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  const s = w / r.width;
  return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s };
}
