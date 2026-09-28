export function xToTime(x: number, width: number, duration: number): number {
  return Math.min(Math.max((x / width) * duration, 0), duration);
}

export function playbackTime(
  now: number,
  startedAt: number,
  offset: number,
  duration: number,
): number {
  return Math.min(now - startedAt + offset, duration);
}

export function timeToX(time: number, duration: number, width: number): number {
  return (time / duration) * width;
}

// Fraction of the duration one arrow press moves, so short and long files both feel usable.
const KEY_SEEK_STEP = 0.05;

export function keySeekTime(
  key: string,
  time: number,
  duration: number,
): number | null {
  const step = duration * KEY_SEEK_STEP;
  const clamp = (t: number) => Math.min(Math.max(t, 0), duration);
  if (key === "ArrowRight") return clamp(time + step);
  if (key === "ArrowLeft") return clamp(time - step);
  if (key === "Home") return 0;
  if (key === "End") return duration;
  return null;
}
