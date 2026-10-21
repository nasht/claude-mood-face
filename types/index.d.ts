export type Eye =
  | 'open'
  | 'left'
  | 'right'
  | 'up'
  | 'upRight'
  | 'down'
  | 'closed'
  | 'half'
  | 'flat'
  | 'happy'
  | 'x'
  | 'angry'
  | 'sad'

export type Mouth = 'neutral' | 'smile' | 'grin' | 'flat' | 'small' | 'o' | 'frown' | 'wavy' | 'teeth'

export type Extra = 'blush' | 'sweatHigh' | 'sweatMid' | 'sweatLow' | 'waveUp' | 'waveDown'

// One frame of the pixel face, with the text face drawn where pixels can't be.
export type Frame = { text: string; eyes: Eye; mouth: Mouth; extras?: Extra[] }

// How Claude feels over time: cheer from -1 (sulky) to 1 (chipper), energy from 0 to 1.
export type Temperament = { cheer: number; energy: number }

export type Personality =
  | 'default'
  | 'sardonic'
  | 'optimist'
  | 'marvin'
  | 'noir'
  | 'narrator'
  | 'pirate'
  | 'bard'
  | 'zen'
  | 'philosopher'
  | 'aesop'
  | 'bukowski'
  | 'hippie'
  | 'geezer'

export type Shown = {
  frame: Frame
  note: string
  color: string
  body: string
  temperament: Temperament
  personality: Personality
}

declare module 'claude-code' {
  interface PluginState {
    'mood-face': { shown: Shown; isHidden: boolean; isPaneShown: boolean }
  }
}
