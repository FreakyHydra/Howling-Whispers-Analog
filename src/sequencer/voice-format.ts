import type { DrumVoiceSettings } from './types'

export type VoiceNumericParam = 'level' | 'tune' | 'decay' | 'tone' | 'pan'

export function formatVoiceValue(param: VoiceNumericParam, value: number): string {
  if (param === 'level' || param === 'tone') return `${Math.round(value * 100)}%`
  if (param === 'tune') return `${value > 0 ? '+' : ''}${Math.round(value)} st`
  if (param === 'decay') return `${value.toFixed(2)} s`
  if (param === 'pan') {
    if (Math.abs(value) < 0.01) return 'C'
    return `${value < 0 ? 'L' : 'R'}${Math.round(Math.abs(value) * 100)}`
  }
  return String(value)
}

export function voiceNumericValue(voice: DrumVoiceSettings, param: VoiceNumericParam): number {
  return voice[param]
}
