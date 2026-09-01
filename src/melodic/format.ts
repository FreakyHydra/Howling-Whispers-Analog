export function midiNoteName(midi: number): string {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const note = Math.min(127, Math.max(0, Math.round(midi)))
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`
}
