export function formatValue(value: number, unit: string): string {
  if (unit === 'Hz' && value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}kHz`
  if (unit === 'Hz') return `${value.toFixed(value < 10 ? 2 : 0)}Hz`
  if (unit === 's') return `${value.toFixed(value < 0.1 ? 3 : 2)}s`
  if (unit === 'ct') return `${Math.round(value)}ct`
  return value.toFixed(value < 2 ? 2 : 1)
}

export function waveLabel(wave: string): string {
  if (wave === 'sawtooth') return 'SAW'
  if (wave === 'square') return 'SQUARE'
  return 'TRIANGLE'
}
