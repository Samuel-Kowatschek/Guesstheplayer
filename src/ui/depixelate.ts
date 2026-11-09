/**
 * "Depixelate" reveal: the image starts as a few big pixel blocks and
 * sharpens in quick retro steps until it is drawn at full resolution.
 */

/**
 * Block resolutions (image width in "pixels") for each step, growing
 * geometrically from `start` to `target`. The last entry is always `target`.
 */
export function depixelSteps(target: number, count: number, start = 6): number[] {
  if (count <= 1 || target <= start) return [target];
  const ratio = Math.pow(target / start, 1 / (count - 1));
  const steps: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const w = Math.round(start * Math.pow(ratio, i));
    if (steps.length === 0 || w > steps[steps.length - 1]!) steps.push(w);
  }
  steps.push(target);
  return steps;
}

/** Draws `img` into `canvas` as if it had only `blockWidth` pixels across. */
export function drawPixelated(
  canvas: HTMLCanvasElement,
  img: CanvasImageSource,
  blockWidth: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (blockWidth >= width) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    return;
  }
  const small = document.createElement('canvas');
  small.width = blockWidth;
  small.height = Math.max(1, Math.round((blockWidth * height) / width));
  const sctx = small.getContext('2d');
  if (!sctx) return;
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(img, 0, 0, small.width, small.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, width, height);
}

/**
 * Runs the reveal. With `reduced` (prefers-reduced-motion) the sharp image
 * is drawn immediately. Resolves when the final, sharp frame is drawn.
 */
export function depixelate(
  canvas: HTMLCanvasElement,
  img: CanvasImageSource,
  opts: { durationMs: number; steps: number; reduced: boolean },
): Promise<void> {
  const steps = opts.reduced ? [canvas.width] : depixelSteps(canvas.width, opts.steps);
  const stepMs = opts.durationMs / Math.max(1, steps.length - 1);
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      drawPixelated(canvas, img, steps[i]!);
      canvas.dataset.step = String(i);
      if (++i < steps.length) window.setTimeout(next, stepMs);
      else {
        canvas.dataset.sharp = 'true';
        resolve();
      }
    };
    next();
  });
}
