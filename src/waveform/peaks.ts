export function computePeaks(
  channels: Float32Array[],
  buckets: number,
): { min: Float32Array; max: Float32Array } {
  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);
  const samples = channels[0];
  const n = samples.length;
  if (n === 0) return { min, max };
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor((i * n) / buckets);
    const end = Math.max(start + 1, Math.floor(((i + 1) * n) / buckets));
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = start; j < end; j++) {
      lo = Math.min(lo, samples[j]);
      hi = Math.max(hi, samples[j]);
    }
    min[i] = lo;
    max[i] = hi;
  }
  return { min, max };
}
