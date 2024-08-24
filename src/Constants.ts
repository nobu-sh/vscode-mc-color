import { Mode } from './extension'

/* eslint-disable @typescript-eslint/naming-convention */
export const BedrockColors = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#C6C6C6',
  '8': '#555555',
  '9': '#5555FF',
  'a': '#55FF55',
  'b': '#55FFFF',
  'c': '#ff5555',
  'd': '#ff55ff',
  'e': '#ffff55',
  'f': '#ffffff',
  'g': '#ddd605',
  'h': '#E3D4D1',
  'i': '#CECACA',
  'j': '#443A3B',
  'm': '#971607',
  'n': '#B4684D',
  'p': '#DEB12D',
  'q': '#47A036',
  's': '#2CBAA8',
  't': '#21497B',
  'u': '#9A5CC6',
} as const

export const JavaColors = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#C6C6C6',
  '8': '#555555',
  '9': '#5555FF',
  'a': '#55FF55',
  'b': '#55FFFF',
  'c': '#ff5555',
  'd': '#ff55ff',
  'e': '#ffff55',
  'f': '#ffffff',
} as const

export const BedrockSpecial = {
  'l': 'BOLD',
  'o': 'ITALIC',
  'r': 'RESET',
  'k': 'OBFUSCATED'
} as const

export const JavaSpecial = {
  'l': 'BOLD',
  'o': 'ITALIC',
  'r': 'RESET',
  'n': 'UNDERLINE',
  'm': 'STRIKETHROUGH',
  'k': 'OBFUSCATED'
} as const

export const SpecialHidden = [
  'UNDERLINE_STRIKETHROUGH'
] as const

export type BedrockSpecialUnion = typeof BedrockSpecial[keyof typeof BedrockSpecial]
export type JavaSpecialUnion = typeof JavaSpecial[keyof typeof JavaSpecial]
export type SpecialHiddenUnion = typeof SpecialHidden[number]

export type MergedSpecialUnion = BedrockSpecialUnion | JavaSpecialUnion
export type MergedSpecialUnionWithHidden = MergedSpecialUnion | SpecialHiddenUnion

export const BedrockSpecialValues = [...Object.values(BedrockSpecial) as BedrockSpecialUnion[], ...SpecialHidden]
export const JavaSpecialValues = [...Object.values(JavaSpecial) as JavaSpecialUnion[], ...SpecialHidden]

export function getFormats(version: Mode) {
  return {
    colors: version === 'bedrock' ? BedrockColors : JavaColors,
    special: version === 'bedrock' ? BedrockSpecial : JavaSpecial,
    values: version === 'bedrock' ? BedrockSpecialValues : JavaSpecialValues
  }
}

export type Formats = ReturnType<typeof getFormats>

// export type SpecialUnion = typeof Special[keyof typeof Special]
// export type SpecialHiddenUnion = typeof SpecialHidden[number]
// export const SpecialValues: SpecialUnion[] = Object.values(Special)