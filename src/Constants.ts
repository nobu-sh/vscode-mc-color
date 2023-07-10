/* eslint-disable @typescript-eslint/naming-convention */
export const Colors = {
  '0': '#000000',
  '1': '#0000aa',
  '2': '#00aa00',
  '3': '#00aaaa',
  '4': '#aa0000',
  '5': '#aa00aa',
  '6': '#ffaa00',
  '7': '#aaaaaa',
  '8': '#555555',
  '9': '#5555ff',
  'a': '#55ff55',
  'b': '#55ffff',
  'c': '#ff5555',
  'd': '#ff55ff',
  'e': '#ffff55',
  'f': '#ffffff',
  'g': '#ddd605',
  'h': '#e4d5d2',
  'i': '#cfcbcb',
  'j': '#e4d5d2',
  'k': '#443a3b',
  'm': '#981607',
  'n': '#b5684d',
  'p': '#dfb22d',
  'q': '#11a136',
  's': '#2cbba9',
  't': '#21497b',
  'u': '#9b5cc7',
} as const

export const Special = {
  'l': 'BOLD',
  'o': 'ITALIC',
  'n': 'UNDERLINE',
  'm': 'STRIKETHROUGH',
  'ψ': 'HIDDEN_UNDERLINE_STRIKETHROUGH',
  // 'k': 'OBFUSCATED',
  'r': 'RESET'
} as const

export type SpecialUnion = typeof Special[keyof typeof Special]
export const SpecialValues: SpecialUnion[] = Object.values(Special)
