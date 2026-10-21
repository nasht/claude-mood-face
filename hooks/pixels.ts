import type { Extra, Eye, Frame, Mouth, Personality } from '../types'

// The face is a 16 x 8 pixel grid drawn as 16 x 4 terminal cells: each cell is a
// half block whose foreground is the top pixel and background the bottom one.
export const FACE_COLUMNS = 16
export const FACE_ROWS = 4

// '.' is transparent, 'O' the body; the rest are fixed colours.
const HEAD = [
  '.OOOOOOOOOOOO...',
  'OOOOOOOOOOOOOO..',
  'OOOOOOOOOOOOOO..',
  'OOOOOOOOOOOOOO..',
  'OOOOOOOOOOOOOO..',
  'OOOOOOOOOOOOOO..',
  'OOOOOOOOOOOOOO..',
  '.OOOOOOOOOOOO...',
]

const LEFT_EYE = { x: 2, y: 2 }
const RIGHT_EYE = { x: 9, y: 2 }
const MOUTH = { x: 4, y: 5 }
const SWEAT_X = 14
const HAND_X = 14

const PALETTE: Record<string, number> = {
  W: 0xf4ede4, // eye white
  D: 0x1f1a17, // pupil, mouth
  P: 0xe88aa0, // blush
  B: 0x9cc8f0, // sweat highlight
  b: 0x4a8fd6, // sweat
  H: 0x3a3330, // fedora
  K: 0xc8b27a, // pith helmet
  R: 0xc8322d, // bandana
  V: 0x7d4fa8, // beret
  L: 0x4f8a3c, // laurel
  l: 0x8cc46a, // laurel highlight
  E: 0xd9d4cc, // beard
  Y: 0xf5d76e, // sparkle
  g: 0xe0b040, // gold
  G: 0x4a4f57, // rivet
  A: 0xff6a2a, // cigarette ember
  S: 0xa8a8a8, // smoke
  T: 0x2fa8a0, // headband
  F: 0xf2a0c8, // flower petal
  C: 0x6b5a45, // flat cap
  c: 0x8a7658, // flat cap tweed
  M: 0x9a7b4f, // deerstalker
  m: 0x6e5636, // deerstalker check, pipe
}
const TERMINAL_DEFAULT = 0x01000000

const UPPER_HALF = 0x2580
const LOWER_HALF = 0x2584
const FULL_BLOCK = 0x2588
const SPACE = 0x20

// 3 x 3 eyes, written for the left eye; `mirrored` ones flip for the right.
const EYES: Record<Eye, { rows: string[]; isMirrored?: boolean }> = {
  open: { rows: ['WWW', 'WDW', 'WWW'] },
  left: { rows: ['WWW', 'DWW', 'WWW'] },
  right: { rows: ['WWW', 'WWD', 'WWW'] },
  up: { rows: ['WDW', 'WWW', 'WWW'] },
  upRight: { rows: ['WWD', 'WWW', 'WWW'] },
  down: { rows: ['WWW', 'WWW', 'WDW'] },
  closed: { rows: ['OOO', 'OOO', 'DDD'] },
  half: { rows: ['OOO', 'WDW', 'WWW'] },
  flat: { rows: ['OOO', 'DDD', 'OOO'] },
  happy: { rows: ['ODO', 'DOD', 'OOO'] },
  x: { rows: ['DOD', 'ODO', 'DOD'] },
  angry: { rows: ['WOO', 'WDW', 'WWW'], isMirrored: true },
  sad: { rows: ['OOW', 'WDW', 'WWW'], isMirrored: true },
}

// 6 x 2 mouths; '.' leaves the body showing.
const MOUTHS: Record<Mouth, string[]> = {
  neutral: ['......', '.DDDD.'],
  smile: ['D....D', '.DDDD.'],
  grin: ['DWWWWD', '.DDDD.'],
  flat: ['......', 'DDDDDD'],
  small: ['......', '..DD..'],
  o: ['..DD..', '..DD..'],
  frown: ['.DDDD.', 'D....D'],
  wavy: ['.D..D.', 'D.DD.D'],
  teeth: ['DWDWDD', 'DDDDDD'],
}

const EXTRAS: Record<Extra, { x: number; y: number; color: string }[]> = {
  blush: [
    { x: 1, y: 5, color: 'P' },
    { x: 2, y: 5, color: 'P' },
    { x: 11, y: 5, color: 'P' },
    { x: 12, y: 5, color: 'P' },
  ],
  sweatHigh: [
    { x: SWEAT_X, y: 0, color: 'B' },
    { x: SWEAT_X, y: 1, color: 'b' },
  ],
  sweatMid: [
    { x: SWEAT_X, y: 2, color: 'B' },
    { x: SWEAT_X, y: 3, color: 'b' },
  ],
  sweatLow: [
    { x: SWEAT_X, y: 4, color: 'B' },
    { x: SWEAT_X, y: 5, color: 'b' },
  ],
  // A 2 x 2 hand beside the head, raised or lowered for a wave.
  waveUp: [
    { x: HAND_X, y: 1, color: 'O' },
    { x: HAND_X + 1, y: 1, color: 'O' },
    { x: HAND_X, y: 2, color: 'O' },
    { x: HAND_X + 1, y: 2, color: 'O' },
  ],
  waveDown: [
    { x: HAND_X, y: 3, color: 'O' },
    { x: HAND_X + 1, y: 3, color: 'O' },
    { x: HAND_X, y: 4, color: 'O' },
    { x: HAND_X + 1, y: 4, color: 'O' },
  ],
}

// Each personality's flourish, stamped after the eyes and mouth and before the extras.
type Patch = { rows: string[]; at: { x: number; y: number } }
const ACCESSORIES: Partial<Record<Personality, Patch[]>> = {
  // One brow raised.
  sardonic: [{ at: { x: 9, y: 0 }, rows: ['.DD', 'D..'] }],
  optimist: [{ at: { x: 14, y: 0 }, rows: ['.Y', 'YY', '.Y'] }],
  marvin: [
    { at: { x: 1, y: 1 }, rows: ['G'] },
    { at: { x: 12, y: 1 }, rows: ['G'] },
    { at: { x: 1, y: 6 }, rows: ['G'] },
    { at: { x: 12, y: 6 }, rows: ['G'] },
  ],
  noir: [
    { at: { x: 2, y: 0 }, rows: ['HHHHHHHHHH'] },
    { at: { x: 0, y: 1 }, rows: ['HHHHHHHHHHHHHHH'] },
  ],
  narrator: [
    { at: { x: 3, y: 0 }, rows: ['KKKKKKKK'] },
    { at: { x: 1, y: 1 }, rows: ['KKKKKKKKKKKK'] },
  ],
  pirate: [
    { at: { x: 1, y: 0 }, rows: ['RRRRRRRRRRRR'] },
    { at: { x: 13, y: 1 }, rows: ['RR'] },
    { at: { x: 2, y: 1 }, rows: ['...D', 'DDD.', 'DDD.', 'DDD.'] },
  ],
  bard: [
    { at: { x: 1, y: 0 }, rows: ['VVVVVVVVVVWW'] },
    { at: { x: 0, y: 1 }, rows: ['VVVV'] },
  ],
  zen: [{ at: { x: 6, y: 1 }, rows: ['gg'] }],
  philosopher: [
    { at: { x: 1, y: 6 }, rows: ['EEE......EEE'] },
    { at: { x: 2, y: 7 }, rows: ['EEEEEEEEEE'] },
  ],
  aesop: [
    { at: { x: 1, y: 0 }, rows: ['LlLlLlLlLlLl'] },
    { at: { x: 0, y: 1 }, rows: ['L............L'] },
  ],
  // A cigarette in the corner of the mouth, smoke curling off it.
  bukowski: [
    { at: { x: 9, y: 6 }, rows: ['WWWWA'] },
    { at: { x: 14, y: 3 }, rows: ['.S', 'S.', '.S'] },
  ],
  hippie: [
    { at: { x: 0, y: 1 }, rows: ['TTTTTTTTTTTTTT'] },
    { at: { x: 12, y: 0 }, rows: ['.F.', 'FYF', '.F.'] },
  ],
  // A flat cap, its peak jutting out over the right.
  geezer: [
    { at: { x: 1, y: 0 }, rows: ['CcCcCcCcCcCc'] },
    { at: { x: 0, y: 1 }, rows: ['CCCCCCCCCCCCCCCC'] },
  ],
  // A deerstalker with its ear flaps down, and a pipe.
  holmes: [
    { at: { x: 1, y: 0 }, rows: ['MmMmMmMmMmMm'] },
    { at: { x: 0, y: 1 }, rows: ['mMmMmMmMmMmMmM', 'M............M'] },
    { at: { x: 9, y: 6 }, rows: ['DDD'] },
    { at: { x: 12, y: 5 }, rows: ['mm', 'mm'] },
  ],
}

const stamp = (grid: string[][], rows: string[], at: { x: number; y: number }) =>
  rows.forEach((row, dy) =>
    [...row].forEach((pixel, dx) => {
      if (pixel !== '.') grid[at.y + dy]![at.x + dx] = pixel
    }),
  )

export function framePixels(frame: Frame, personality: Personality = 'default'): string[][] {
  const grid = HEAD.map(row => [...row])
  const eye = EYES[frame.eyes]
  stamp(grid, eye.rows, LEFT_EYE)
  stamp(grid, eye.isMirrored ? eye.rows.map(row => [...row].reverse().join('')) : eye.rows, RIGHT_EYE)
  stamp(grid, MOUTHS[frame.mouth], MOUTH)
  for (const { rows, at } of ACCESSORIES[personality] ?? []) stamp(grid, rows, at)
  for (const extra of frame.extras ?? []) {
    for (const { x, y, color } of EXTRAS[extra]) grid[y]![x] = color
  }

  return grid
}

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary)
}

// Packs the frame as Raster cells: [codePoint, foreground, background] per cell.
export function frameCells(frame: Frame, body: number, personality: Personality = 'default'): string {
  const grid = framePixels(frame, personality)
  const colorOf = (pixel: string) => (pixel === 'O' ? body : PALETTE[pixel])
  const words = new Uint32Array(FACE_COLUMNS * FACE_ROWS * 3)

  for (let row = 0; row < FACE_ROWS; row += 1) {
    for (let column = 0; column < FACE_COLUMNS; column += 1) {
      const top = colorOf(grid[row * 2]![column]!)
      const bottom = colorOf(grid[row * 2 + 1]![column]!)
      const cell =
        top === undefined && bottom === undefined
          ? [SPACE, TERMINAL_DEFAULT, TERMINAL_DEFAULT]
          : top === undefined
            ? [LOWER_HALF, bottom!, TERMINAL_DEFAULT]
            : bottom === undefined
              ? [UPPER_HALF, top, TERMINAL_DEFAULT]
              : top === bottom
                ? [FULL_BLOCK, top, TERMINAL_DEFAULT]
                : [UPPER_HALF, top, bottom]
      words.set(cell, (row * FACE_COLUMNS + column) * 3)
    }
  }

  return toBase64(new Uint8Array(words.buffer))
}
