// Basit console wrapper (v10 core). Davranis degismez, sadece tek noktadan log.
export const logger = {
  info: (...args: unknown[]) => console.info('[Waveify]', ...args),
  warn: (...args: unknown[]) => console.warn('[Waveify]', ...args),
  error: (...args: unknown[]) => console.error('[Waveify]', ...args),
  debug: (...args: unknown[]) => console.debug('[Waveify]', ...args),
};
export default logger;
