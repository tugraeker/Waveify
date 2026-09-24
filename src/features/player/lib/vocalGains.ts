export type VocalMode = 'karaoke' | 'isolate' | 'off';
export function vocalGains(mode: VocalMode): [number, number] {
  if (mode === 'karaoke') return [0, 1];
  if (mode === 'isolate') return [1, 0];
  return [1, 1];
}
