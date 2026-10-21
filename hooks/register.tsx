import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Extra, Eye, Frame, Mouth, Personality, Shown, Temperament } from '../types'
import { type CaptionKind, captionRequest } from './captions'
import { PERSONALITIES, VOICES, findPersonality, isPersonality } from './personalities'
import { FACE_COLUMNS, FACE_ROWS, frameCells } from './pixels'
import { cleanReply, describe, plain, target } from './zingers'

// Each mood is a frame sequence, a caption colour, a body colour and the captions
// it picks from. A sequence loops unless `isOnce`, which plays it once and holds
// the last frame.
type Mood =
  | 'idle'
  | 'content'
  | 'sulky'
  | 'tired'
  | 'sleeping'
  | 'glance'
  | 'hum'
  | 'yawn'
  | 'thinking'
  | 'working'
  | 'sweating'
  | 'melting'
  | 'eyeroll'
  | 'wave'
  | 'shy'
  | 'blush'
  | 'laugh'
  | 'startled'
  | 'nervous'
  | 'annoyed'
  | 'tableflip'
  | 'proud'
  | 'interrupted'
  | 'grumpy'

type Look = {
  frames: Frame[]
  color: string
  body?: string
  notes: string[]
  frameMs?: number
  isOnce?: boolean
}

const CLAUDE_ORANGE = '#d97757'
const SLEEPY_ORANGE = '#9a6a55'
const FLUSHED_ORANGE = '#c0583a'
const ANGRY_RED = '#d9534f'
const SULKY_ORANGE = '#a8705c'

const f = (text: string, eyes: Eye, mouth: Mouth, ...extras: Extra[]): Frame => ({ text, eyes, mouth, extras })
const times = (frame: Frame, count: number) => Array.from({ length: count }, () => frame)

const IDLE_FRAME = f('(•‿•)', 'open', 'smile')

const LOOKS: Record<Mood, Look> = {
  idle: {
    // A short blink every few seconds.
    frames: [...times(IDLE_FRAME, 13), f('(-‿-)', 'closed', 'smile')],
    frameMs: 300,
    color: CLAUDE_ORANGE,
    notes: [''],
  },
  content: {
    frames: [...times(f('(ᵔ‿ᵔ)', 'open', 'grin'), 13), f('(-‿-)', 'closed', 'grin')],
    frameMs: 300,
    color: 'green',
    notes: [''],
  },
  sulky: {
    frames: [...times(f('(¬_¬)', 'half', 'flat'), 10), f('(-_-)', 'flat', 'flat')],
    frameMs: 300,
    color: 'gray',
    body: SULKY_ORANGE,
    notes: ['...'],
  },
  tired: {
    frames: [...times(f('(=_=)', 'half', 'small'), 8), f('(-_-)', 'closed', 'small')],
    frameMs: 400,
    color: 'gray',
    body: SLEEPY_ORANGE,
    notes: ['running on fumes', 'need a break'],
  },
  sleeping: {
    frames: [f('(－_－) z', 'closed', 'small'), f('(－_－) zZ', 'closed', 'small'), f('(－_－) zzZ', 'closed', 'small')],
    color: 'gray',
    body: SLEEPY_ORANGE,
    notes: ['zzZ  wake me if you need me'],
  },
  glance: {
    frames: [
      f('(•_•)', 'left', 'neutral'),
      f('(•_•)', 'left', 'neutral'),
      f('(•_•)', 'open', 'neutral'),
      f('(•_•)', 'right', 'neutral'),
      f('(•_•)', 'right', 'neutral'),
      f('(•‿•)', 'open', 'smile'),
    ],
    frameMs: 350,
    isOnce: true,
    color: CLAUDE_ORANGE,
    notes: [''],
  },
  hum: {
    frames: [f('(˘‿˘)♪', 'happy', 'small'), f('(˘‿˘)♫', 'closed', 'small')],
    frameMs: 450,
    color: CLAUDE_ORANGE,
    notes: ['♪ ~', '♫ hm hm hmm'],
  },
  yawn: {
    frames: [f('(-o-)', 'closed', 'small'), f('(-O-)', 'closed', 'o'), f('(-O-)', 'closed', 'o'), f('(=_=)', 'half', 'small')],
    frameMs: 500,
    isOnce: true,
    color: 'gray',
    notes: ['*yawn*'],
  },
  thinking: {
    frames: [
      f('( ˘_˘)', 'upRight', 'small'),
      f('( ˘_˘).', 'upRight', 'small'),
      f('( ˘_˘)..', 'up', 'small'),
      f('( ˘_˘)...', 'upRight', 'small'),
    ],
    color: CLAUDE_ORANGE,
    notes: ['hmm', 'thinking', 'let me see'],
  },
  working: {
    frames: [f('(•̀_•́ )', 'down', 'flat'), f('(•̀_•́ )ง', 'down', 'neutral')],
    color: CLAUDE_ORANGE,
    notes: ['on it', 'working', 'getting there'],
  },
  sweating: {
    frames: [
      f('(•_•;)', 'open', 'wavy', 'sweatHigh'),
      f('(•_•;)ˎ', 'open', 'wavy', 'sweatMid'),
      f('(°_°;) .', 'down', 'wavy', 'sweatLow'),
    ],
    frameMs: 400,
    color: 'yellow',
    notes: ['this is a big one', 'still going', 'more than I expected'],
  },
  melting: {
    frames: [
      f('(×_×;;)', 'x', 'wavy', 'sweatHigh'),
      f('(@_@;;)', 'closed', 'wavy', 'sweatMid'),
      f('(×_×;;) ~', 'x', 'wavy', 'sweatLow'),
    ],
    frameMs: 400,
    color: 'red',
    body: FLUSHED_ORANGE,
    notes: ['send coffee', 'still alive, barely', 'deep in it now'],
  },
  eyeroll: {
    // Pupils glance left, roll up and over to the right, then settle flat.
    frames: [
      f('(•_•)', 'open', 'flat'),
      f('(◐_◐)', 'left', 'flat'),
      f('(◓_◓)', 'up', 'flat'),
      f('(◓_◓)', 'up', 'flat'),
      f('(◓_◓)', 'up', 'flat'),
      f('(◑_◑)', 'right', 'flat'),
      f('(-_-)', 'flat', 'flat'),
    ],
    frameMs: 180,
    isOnce: true,
    color: 'magenta',
    notes: ['...really?', 'sure, ok'],
  },
  wave: {
    frames: [f('(•‿•)ノ', 'open', 'grin', 'waveUp'), f('(•‿•)/', 'open', 'grin', 'waveDown')],
    frameMs: 300,
    color: CLAUDE_ORANGE,
    notes: ['hey!', 'hi there'],
  },
  shy: {
    frames: [f('(*•‿•)ノ', 'happy', 'smile', 'blush', 'waveUp'), f('(*•‿•)/', 'happy', 'smile', 'blush', 'waveDown')],
    frameMs: 300,
    color: 'magenta',
    notes: ['likewise!', 'oh, hello'],
  },
  blush: {
    frames: [f('(*^‿^*)', 'happy', 'smile', 'blush'), f('(*^ω^*)', 'happy', 'grin', 'blush')],
    color: 'magenta',
    notes: ['aw, thanks', 'happy to help'],
  },
  laugh: {
    frames: [f('(≧▽≦)', 'happy', 'grin'), f('(≧∇≦)', 'closed', 'grin')],
    frameMs: 250,
    color: 'green',
    notes: ['heh', 'lol'],
  },
  startled: {
    frames: [f('(°ロ°)', 'open', 'o'), f('(°ロ°) !', 'up', 'o')],
    color: 'yellow',
    notes: ['okay okay!', 'no need to shout'],
  },
  nervous: {
    frames: [f('(；・∀・)', 'left', 'wavy', 'sweatHigh'), f('(；・∀・)ゞ', 'right', 'wavy', 'sweatHigh')],
    frameMs: 350,
    color: 'yellow',
    notes: ['...sorry', 'let me fix that', 'uh oh'],
  },
  annoyed: {
    frames: [f('(ಠ_ಠ)', 'angry', 'flat')],
    color: 'red',
    notes: ['that failed', 'hm. no.'],
  },
  tableflip: {
    frames: [f('(╯°□°)╯︵ ┻━┻', 'angry', 'teeth'), f('┬─┬ノ( º _ ºノ)', 'flat', 'flat')],
    color: 'red',
    body: ANGRY_RED,
    notes: ["(╯°□°)╯︵ ┻━┻  why won't this work", '(╯°□°)╯︵ ┻━┻  everything is failing'],
  },
  proud: {
    frames: [f('(ᵔ◡ᵔ)و', 'happy', 'grin'), f('(ᵔ◡ᵔ)و ✓', 'happy', 'smile')],
    color: 'green',
    notes: ['done!', 'phew, done', 'nailed it'],
  },
  interrupted: {
    frames: [f('(°ロ°)', 'open', 'o'), f('(・_・)', 'open', 'neutral')],
    color: 'yellow',
    notes: ['oh, stopping', 'fine, fine'],
  },
  grumpy: {
    frames: [f('(・へ・)', 'sad', 'frown')],
    color: 'gray',
    body: SULKY_ORANGE,
    notes: ["can't do that one", 'something broke'],
  },
}

const TICK_MS = 150
const PANE_SYNC_MS = 1_000
const DEFAULT_FRAME_MS = 600
const MIN_NOTE_COLUMNS = 12
const THINKING_UNTIL_MS = 20_000
const SWEAT_AFTER_MS = 90_000
const MELT_AFTER_MS = 240_000
const SLEEP_AFTER_MS = 10 * 60_000
const REACTION_MS = 5_000
const GREETING_MS = 6_000
const ERROR_FLASH_MS = 3_500
const OUTCOME_MS = 8_000
const PROUD_AFTER_MS = 60_000
const TABLEFLIP_ERRORS = 3
const SHORT_QUESTION_WORDS = 7
const SHORT_QUESTIONS_BEFORE_EYEROLL = 3
const REPEAT_SIMILARITY = 0.8
const REPEAT_MIN_WORDS = 3
const REMEMBERED_PROMPTS = 20
const GREETING_PREFIX_CHARS = 30

// Captions about the task, written by a small model in the personality's voice.
const CAPTION_NOTE_MS = 8_000
const MUSE_NOTE_MS = 20_000
const CAPTION_GAP_MS = 3_000 // at most one model call this often
const MUSE_AFTER_MS = 45_000 // a turn this long, quiet this long, gets an idea or fable
const MUSES_PER_TURN = 10
const REMEMBERED_CAPTIONS = 8
const REMEMBERED_ACTIVITY = 5
const REPEATS_BEFORE_COUNTING = 2
const TASK_MIN_WORDS = 3
// A higher kind waiting to be written isn't replaced by a lower one.
const CAPTION_RANK: Record<CaptionKind, number> = { muse: 0, activity: 1, task: 2, hello: 3 }

// Idle fidgets: a glance, hum or yawn now and then.
const FIDGET_MIN_GAP_MS = 20_000
const FIDGET_MAX_GAP_MS = 45_000
const FIDGET_MS = 2_500

// Temperament: how far each event moves cheer, and how fast it all drifts.
const CHEER = {
  greeting: 0.15,
  thanks: 0.2,
  laugh: 0.1,
  proud: 0.1,
  repeat: -0.1,
  eyeroll: -0.05,
  shouting: -0.15,
  frustration: -0.1,
  toolError: -0.03,
  tableflip: -0.1,
  aborted: -0.05,
}
const CHEER_HALF_LIFE_MS = 30 * 60_000
const ENERGY_DRAIN_MS = 20 * 60_000 // working this long empties energy
const ENERGY_RECOVERY_MS = 10 * 60_000 // resting this long refills it
const AWAY_RECOVERY_MS = 8 * 60 * 60_000
const CONTENT_CHEER = 0.4
const SULKY_CHEER = -0.35
const TIRED_ENERGY = 0.25
const YAWN_ENERGY = 0.5
const SAVE_EVERY_MS = 60_000
const TEMPERAMENT_STEP = 10 // drawn values round to tenths, so drift rarely redraws

// Welcome-backs on session start.
const WELCOME_BACK_AFTER_MS = 8 * 60 * 60_000
const LONG_TIME_AFTER_MS = 3 * 24 * 60 * 60_000

// The corner pane: a column docked beside the fullscreen transcript.
const PANE = 'mood-face'
const PANE_COLUMNS = 22
const METER_CELLS = 5

const STORE = { temperament: 'temperament', lastSeenAt: 'lastSeenAt', placement: 'placement', quips: 'quips', personality: 'personality' } as const
type Placement = 'corner' | 'band'

const NEUTRAL: Temperament = { cheer: 0, energy: 1 }
const IDLE: Shown = {
  frame: IDLE_FRAME,
  note: '',
  color: CLAUDE_ORANGE,
  body: CLAUDE_ORANGE,
  temperament: NEUTRAL,
  personality: 'default',
}
const shown = atom({ plugin: 'mood-face', key: 'shown' } as const, IDLE)
const isHidden = atom({ plugin: 'mood-face', key: 'isHidden' } as const, false)
const isPaneShown = atom({ plugin: 'mood-face', key: 'isPaneShown' } as const, false)

type Flash = { mood: Mood; note?: string; until: number }
type TaskNote = { note: string; until: number }

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

// Jaccard overlap of the two prompts' word sets.
const similarity = (a: string[], b: string[]) => {
  const left = new Set(a)
  const right = new Set(b)
  const shared = [...left].filter(word => right.has(word)).length
  const all = new Set([...left, ...right]).size

  return all === 0 ? 0 : shared / all
}

const THANKS = /\b(thanks|thank you|thx|ty|cheers|legend|nice work|great job|awesome)\b/i
const LAUGH = /\b(lol|lmao|haha+|hehe)\b|😂|🤣/i
const FRUSTRATED = /\b(still|again|wrong|broken|doesn'?t work|not working|wtf|ugh|why (is|does|won'?t))\b/i
const SHOUTING = /!!|^[^a-z]*[A-Z]{4,}[^a-z]*$/
const GREETING = /\b(hi|hey|hello|howdy|hiya|yo|g'?day|good (morning|afternoon|evening)|morning)\b/i
const MEETING = /\b(nice|pleased|good|great) to meet you\b/i
const FAREWELL = /\b(bye|goodbye|good ?night|see (you|ya)|cya|ttyl)\b/i

type Mind = {
  turnId: string | undefined
  turnStartedAt: number
  lastActiveAt: number
  errors: number
  flash: Flash | undefined
  shortQuestions: number
  recent: string[][]
  lastMood: Mood | undefined
  moodStartedAt: number
  noteSeed: number
  temperament: Temperament
  lastTickAt: number
  lastSavedAt: number
  nextFidgetAt: number
  task: TaskNote | undefined
  repeats: Map<string, number>
  hasQuips: boolean
  personality: Personality
  taskText: string
  activity: string[]
  captions: string[]
  writer: Writer
}

type Writer = {
  pending: CaptionKind | undefined
  isWriting: boolean
  lastAskedAt: number
  lastShownAt: number
  // Bumped by each new prompt, so a reply about the previous task is dropped.
  promptSerial: number
  muses: number
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const hexColor = (hex: string) => Number.parseInt(hex.slice(1), 16)
const pick = <T,>(list: T[], seed: number) => list[seed % list.length]!
const fidgetGap = () => FIDGET_MIN_GAP_MS + Math.random() * (FIDGET_MAX_GAP_MS - FIDGET_MIN_GAP_MS)

const cheerUp = (mind: Mind, amount: number) => {
  mind.temperament.cheer = clamp(mind.temperament.cheer + amount, -1, 1)
}

function react(mind: Mind, text: string, now: number): Flash | undefined {
  const said = words(text)
  const isRepeat =
    said.length >= REPEAT_MIN_WORDS &&
    mind.recent.some(before => similarity(before, said) >= REPEAT_SIMILARITY)
  mind.recent.push(said)
  mind.recent.splice(0, mind.recent.length - REMEMBERED_PROMPTS)

  const isShortQuestion = said.length <= SHORT_QUESTION_WORDS && text.trim().endsWith('?')
  mind.shortQuestions = isShortQuestion ? mind.shortQuestions + 1 : 0
  const opening = text.slice(0, GREETING_PREFIX_CHARS)
  const until = now + REACTION_MS

  if (isRepeat) {
    cheerUp(mind, CHEER.repeat)
    return { mood: 'eyeroll', note: 'you asked that already', until }
  }
  if (mind.shortQuestions >= SHORT_QUESTIONS_BEFORE_EYEROLL) {
    cheerUp(mind, CHEER.eyeroll)
    return { mood: 'eyeroll', note: `question #${mind.shortQuestions}...`, until }
  }
  if (SHOUTING.test(text.trim())) {
    cheerUp(mind, CHEER.shouting)
    return { mood: 'startled', until }
  }
  if (FRUSTRATED.test(text)) {
    cheerUp(mind, CHEER.frustration)
    return { mood: 'nervous', until }
  }
  if (MEETING.test(text)) {
    cheerUp(mind, CHEER.greeting)
    return { mood: 'shy', until: now + GREETING_MS }
  }
  if (FAREWELL.test(opening)) {
    cheerUp(mind, CHEER.greeting)
    return { mood: 'wave', note: 'bye! see you soon', until: now + GREETING_MS }
  }
  if (GREETING.test(opening)) {
    cheerUp(mind, CHEER.greeting)
    return { mood: 'wave', until: now + GREETING_MS }
  }
  if (THANKS.test(text)) {
    cheerUp(mind, CHEER.thanks)
    return { mood: 'blush', until }
  }
  if (LAUGH.test(text)) {
    cheerUp(mind, CHEER.laugh)
    return { mood: 'laugh', until }
  }

  return undefined
}

// Energy drains while working and returns while resting; cheer fades toward neutral.
function drift(mind: Mind, now: number) {
  const elapsed = Math.max(0, now - mind.lastTickAt)
  mind.lastTickAt = now
  const { temperament } = mind
  const energyChange = mind.turnId === undefined ? elapsed / ENERGY_RECOVERY_MS : -elapsed / ENERGY_DRAIN_MS
  temperament.energy = clamp(temperament.energy + energyChange, 0, 1)
  temperament.cheer *= 0.5 ** (elapsed / CHEER_HALF_LIFE_MS)
}

function restingMood(mind: Mind, now: number): { mood: Mood; note?: string } {
  if (now - mind.lastActiveAt > SLEEP_AFTER_MS) return { mood: 'sleeping' }
  const { cheer, energy } = mind.temperament

  if (now >= mind.nextFidgetAt) {
    mind.nextFidgetAt = now + fidgetGap()
    const choices: Mood[] = ['glance']
    if (cheer >= 0) choices.push('hum')
    if (energy < YAWN_ENERGY) choices.push('yawn')
    mind.flash = { mood: pick(choices, Math.floor(Math.random() * choices.length)), until: now + FIDGET_MS }

    return mind.flash
  }
  if (energy < TIRED_ENERGY) return { mood: 'tired' }
  if (cheer > CONTENT_CHEER) return { mood: 'content' }
  if (cheer < SULKY_CHEER) return { mood: 'sulky' }

  return { mood: 'idle' }
}

function moodAt(mind: Mind, now: number): { mood: Mood; note?: string } {
  if (mind.flash !== undefined && now < mind.flash.until) return mind.flash
  if (mind.turnId === undefined) return restingMood(mind, now)
  // A fresh zinger about the task wins; once it lapses the mood's own notes return.
  const note = mind.task !== undefined && now < mind.task.until ? mind.task.note : undefined
  const elapsed = now - mind.turnStartedAt
  if (elapsed > MELT_AFTER_MS) return { mood: 'melting', note }
  if (elapsed > SWEAT_AFTER_MS) return { mood: 'sweating', note }
  if (elapsed > THINKING_UNTIL_MS) return { mood: 'working', note }

  return { mood: 'thinking', note }
}

function want(mind: Mind, kind: CaptionKind) {
  const { pending } = mind.writer
  if (pending === undefined || CAPTION_RANK[kind] >= CAPTION_RANK[pending]) mind.writer.pending = kind
}

function noteToolCall(mind: Mind, tool: string, input: Record<string, unknown>, now: number) {
  const key = target(tool, input)
  const count = key === undefined ? 0 : (mind.repeats.get(key) ?? 0) + 1
  if (key !== undefined) mind.repeats.set(key, count)
  const doing = plain({ ...describe(tool, input), n: count >= REPEATS_BEFORE_COUNTING ? count : undefined })
  mind.activity.push(doing)
  mind.activity.splice(0, mind.activity.length - REMEMBERED_ACTIVITY)
  // Without the model, the plain description is the caption.
  if (mind.hasQuips) want(mind, 'activity')
  else mind.task = { note: doing, until: now + CAPTION_NOTE_MS }
}

function showCaption(mind: Mind, kind: CaptionKind, note: string, now: number) {
  mind.captions.push(note)
  mind.captions.splice(0, mind.captions.length - REMEMBERED_CAPTIONS)
  mind.writer.lastShownAt = now
  if (kind === 'hello') mind.flash = { mood: 'wave', note, until: now + GREETING_MS }
  else mind.task = { note, until: now + (kind === 'muse' ? MUSE_NOTE_MS : CAPTION_NOTE_MS) }
}

// Writes the waiting caption, one model call at a time and no more often than the gap.
async function writeCaption($: EngineInterface, mind: Mind, now: number) {
  const { writer } = mind
  const kind = writer.pending
  if (kind === undefined || writer.isWriting || now - writer.lastAskedAt < CAPTION_GAP_MS) return
  if (kind !== 'hello' && kind !== 'task' && mind.turnId === undefined) {
    writer.pending = undefined
    return
  }
  writer.pending = undefined
  writer.isWriting = true
  writer.lastAskedAt = now
  if (kind === 'muse') writer.muses += 1
  const serial = writer.promptSerial
  const mood = mind.lastMood ?? 'idle'

  try {
    const { request, maxChars } = captionRequest({
      kind,
      personality: mind.personality,
      task: mind.taskText,
      activity: mind.activity,
      mood,
      turnMs: mind.turnId === undefined ? 0 : now - mind.turnStartedAt,
      errors: mind.errors,
      feeling: feeling(mind.temperament),
      said: mind.captions,
    })
    const reply = await $.model.complete(request)
    const note = reply.isAnswered ? cleanReply(reply.text, maxChars, kind !== 'muse') : undefined
    const isStale = kind !== 'hello' && (serial !== writer.promptSerial || (kind !== 'task' && mind.turnId === undefined))
    if (note !== undefined && !isStale) showCaption(mind, kind, note, await $.clock.now())
  } finally {
    writer.isWriting = false
  }
}

// A long turn that has gone quiet gets an idea, a fable or a remark, depending on the voice.
function wantMuse(mind: Mind, now: number) {
  const { writer } = mind
  const isQuiet = now - Math.max(writer.lastShownAt, mind.turnStartedAt) >= MUSE_AFTER_MS
  if (mind.hasQuips && mind.turnId !== undefined && isQuiet && writer.muses < MUSES_PER_TURN) want(mind, 'muse')
}

const rounded = ({ cheer, energy }: Temperament): Temperament => ({
  cheer: Math.round(cheer * TEMPERAMENT_STEP) / TEMPERAMENT_STEP,
  energy: Math.round(energy * TEMPERAMENT_STEP) / TEMPERAMENT_STEP,
})

async function saveTemperament($: EngineInterface, mind: Mind, now: number) {
  mind.lastSavedAt = now
  await $.store.set(STORE.temperament, mind.temperament)
  await $.store.set(STORE.lastSeenAt, now)
}

async function tick($: EngineInterface, mind: Mind) {
  const now = await $.clock.now()
  drift(mind, now)
  const { mood, note } = moodAt(mind, now)
  if (mood !== mind.lastMood) {
    mind.lastMood = mood
    mind.moodStartedAt = now
    mind.noteSeed += 1
  }
  wantMuse(mind, now)
  void writeCaption($, mind, now).catch(() => undefined)
  const look = LOOKS[mood]
  const frame = Math.floor((now - mind.moodStartedAt) / (look.frameMs ?? DEFAULT_FRAME_MS))
  const next: Shown = {
    frame: look.isOnce ? look.frames[Math.min(frame, look.frames.length - 1)]! : pick(look.frames, frame),
    note: note ?? pick(look.notes, mind.noteSeed),
    color: look.color,
    body: look.body ?? VOICES[mind.personality].body ?? CLAUDE_ORANGE,
    temperament: rounded(mind.temperament),
    personality: mind.personality,
  }
  // Write only on a visible change, so an unchanged face never redraws.
  await update($, shown, current => (JSON.stringify(current) === JSON.stringify(next) ? current : next))
  if (now - mind.lastSavedAt > SAVE_EVERY_MS) await saveTemperament($, mind, now)
}

// The band steps aside while the corner pane is on screen.
async function syncPane($: EngineInterface) {
  const panes = await $.ui.panes()
  const isShown = panes.some(pane => pane.id === PANE && pane.isPlaced && pane.isShown)
  await update($, isPaneShown, current => (current === isShown ? current : isShown))
}

async function openCorner($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE, title: 'Claude', columns: PANE_COLUMNS })
  await syncPane($)

  return opened.isPlaced
}

// What a long absence does: energy comes back, cheer fades the way it does in a session.
function restored(saved: unknown, awayMs: number): Temperament {
  const value = saved as Partial<Temperament> | undefined
  const cheer = typeof value?.cheer === 'number' ? value.cheer : NEUTRAL.cheer
  const energy = typeof value?.energy === 'number' ? value.energy : NEUTRAL.energy

  return {
    cheer: clamp(cheer * 0.5 ** (awayMs / CHEER_HALF_LIFE_MS), -1, 1),
    energy: clamp(energy + awayMs / AWAY_RECOVERY_MS, 0, 1),
  }
}

function welcome(lastSeenAt: unknown, now: number): Flash | undefined {
  const until = now + GREETING_MS
  if (typeof lastSeenAt !== 'number') return { mood: 'wave', note: "hi, I'm Claude", until }
  const away = now - lastSeenAt
  if (away > LONG_TIME_AFTER_MS) return { mood: 'wave', note: 'long time no see!', until }
  if (away > WELCOME_BACK_AFTER_MS) return { mood: 'wave', note: 'welcome back', until }

  return undefined
}

const feeling = ({ cheer, energy }: Temperament) =>
  energy < TIRED_ENERGY
    ? 'worn out'
    : cheer > CONTENT_CHEER
      ? 'chipper'
      : cheer < SULKY_CHEER
        ? 'a bit sulky'
        : 'fine'

// Text faces wear the personality's badge where the pixel face would wear its accessory.
const withBadge = (face: string, personality: Personality) =>
  VOICES[personality].badge === '' ? face : `${face} ${VOICES[personality].badge}`

const meter = (fraction: number) => {
  const filled = Math.round(clamp(fraction, 0, 1) * METER_CELLS)

  return '▮'.repeat(filled) + '▯'.repeat(METER_CELLS - filled)
}

export const register: Register = on => {
  const mind: Mind = {
    turnId: undefined,
    turnStartedAt: 0,
    lastActiveAt: 0,
    errors: 0,
    flash: undefined,
    shortQuestions: 0,
    recent: [],
    lastMood: undefined,
    moodStartedAt: 0,
    noteSeed: 0,
    temperament: { ...NEUTRAL },
    lastTickAt: 0,
    lastSavedAt: 0,
    nextFidgetAt: 0,
    task: undefined,
    repeats: new Map(),
    hasQuips: true,
    personality: 'default',
    taskText: '',
    activity: [],
    captions: [],
    writer: {
      pending: undefined,
      isWriting: false,
      lastAskedAt: -Infinity,
      lastShownAt: 0,
      promptSerial: 0,
      muses: 0,
    },
  }

  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    const lastSeenAt = await $.store.get(STORE.lastSeenAt)
    const away = typeof lastSeenAt === 'number' ? now - lastSeenAt : 0
    mind.temperament = restored(await $.store.get(STORE.temperament), away)
    mind.flash = welcome(lastSeenAt, now)
    mind.lastActiveAt = now
    mind.lastTickAt = now
    mind.nextFidgetAt = now + fidgetGap()
    mind.hasQuips = (await $.store.get(STORE.quips)) !== false
    const personality = await $.store.get(STORE.personality)
    mind.personality = isPersonality(personality) ? personality : 'default'
    await saveTemperament($, mind, now)

    await $.command.register({
      name: 'face',
      description: "Claude's face: no argument hides or shows it; corner, band, mood, quips or personality",
      argumentHint: '[corner | band | mood | quips | personality <name>]',
    })
    $.clock.every(TICK_MS, () => void tick($, mind))
    $.clock.every(PANE_SYNC_MS, () => void syncPane($))
    if (((await $.store.get(STORE.placement)) ?? 'corner') === 'corner') await openCorner($)

    return next(e)
  })

  on('command.run', { command: 'face' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'corner') {
      await $.store.set(STORE.placement, 'corner' satisfies Placement)
      const isPlaced = await openCorner($)

      return {
        text: isPlaced
          ? 'Face moved to the corner pane.'
          : 'Face pane opened; it shows once the terminal is wide enough.',
      }
    }
    if (arg === 'band') {
      await $.store.set(STORE.placement, 'band' satisfies Placement)
      await $.ui.close({ id: PANE })
      await syncPane($)

      return { text: 'Face moved back above the prompt.' }
    }
    if (arg === 'mood') {
      const { cheer, energy } = mind.temperament

      return {
        text:
          `Feeling ${feeling(mind.temperament)}. cheer ${meter((cheer + 1) / 2)}  energy ${meter(energy)}` +
          `  personality: ${mind.personality}`,
      }
    }

    if (arg === 'quips') {
      mind.hasQuips = !mind.hasQuips
      await $.store.set(STORE.quips, mind.hasQuips)

      return {
        text: mind.hasQuips
          ? 'Quips on: Haiku writes the captions in the current personality.'
          : 'Quips off: captions say what Claude is doing, with no model calls.',
      }
    }

    if (arg === 'personality' || arg.startsWith('personality ')) {
      const wanted = arg.slice('personality'.length).trim()
      const listing = PERSONALITIES.map(p => `  ${p.padEnd(12)}${VOICES[p].label}`).join('\n')
      if (wanted === '') return { text: `Personality: ${mind.personality}. Choose one with /face personality <name>:\n${listing}` }
      const chosen = findPersonality(wanted)
      if (chosen === undefined) return { text: `No personality "${wanted}". The choices:\n${listing}` }

      mind.personality = chosen
      mind.captions = []
      await $.store.set(STORE.personality, chosen)
      const now = await $.clock.now()
      mind.flash = { mood: 'wave', note: `${VOICES[chosen].badge} ${VOICES[chosen].label}`.trim(), until: now + GREETING_MS }
      if (mind.hasQuips) want(mind, 'hello')

      return { text: `Personality: ${chosen}, ${VOICES[chosen].label}.` }
    }

    const wasHidden = await read($, isHidden)
    await update($, isHidden, () => !wasHidden)

    return { text: wasHidden ? '(•‿•) back again' : '(-‿-) face hidden; /face brings it back' }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    // Closing the pane by hand means they'd rather have the band.
    if (e.origin.kind === 'person') await $.store.set(STORE.placement, 'band' satisfies Placement)
    const closed = await next(e)
    await syncPane($)

    return closed
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command === undefined && e.isMeta === undefined) {
      const now = await $.clock.now()
      const reaction = react(mind, e.text, now)
      mind.flash = reaction ?? mind.flash
      mind.lastActiveAt = now
      mind.task = undefined
      // Small talk gets its reaction; a real task becomes what the captions are about.
      if (reaction === undefined && words(e.text).length >= TASK_MIN_WORDS) {
        mind.taskText = e.text
        mind.writer.promptSerial += 1
        if (mind.hasQuips) want(mind, 'task')
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      mind.turnId = e.turnId
      mind.turnStartedAt = await $.clock.now()
      mind.errors = 0
      mind.repeats.clear()
      mind.activity = []
      mind.writer.muses = 0
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) {
      // As with the reaction below, a failed clock read only costs the zinger.
      const now = await $.clock.now().catch(() => undefined)
      if (now !== undefined) noteToolCall(mind, e.tool, e as unknown as Record<string, unknown>, now)
    }
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError === true) {
      mind.errors += 1
      const isTableflip = mind.errors >= TABLEFLIP_ERRORS
      cheerUp(mind, isTableflip ? CHEER.tableflip : CHEER.toolError)
      // A failed clock read only costs the reaction, never the tool's result.
      const now = await $.clock.now().catch(() => undefined)
      if (now !== undefined) mind.flash = { mood: isTableflip ? 'tableflip' : 'annoyed', until: now + ERROR_FLASH_MS }
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.turnId === mind.turnId) {
      const now = await $.clock.now()
      const until = now + OUTCOME_MS
      if (e.reason === 'aborted') {
        cheerUp(mind, CHEER.aborted)
        mind.flash = { mood: 'interrupted', until }
      } else if (e.reason === 'refusal' || e.reason === 'error') {
        mind.flash = { mood: 'grumpy', until }
      } else if (now - mind.turnStartedAt > PROUD_AFTER_MS) {
        cheerUp(mind, CHEER.proud)
        const note = mind.temperament.cheer < SULKY_CHEER ? 'done. finally.' : undefined
        mind.flash = { mood: 'proud', note, until }
      }
      mind.turnId = undefined
      mind.task = undefined
      mind.lastActiveAt = now
      mind.nextFidgetAt = now + fidgetGap()
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { frame, note, color, body, temperament, personality } = await read($, shown)
    const { cheer, energy } = temperament

    if (e.surface === 'terminal') {
      const { Box, Raster, Text } = $.ui.resolve(e)

      return (
        <Box flexDirection="column" alignItems="center">
          <Raster key="face" columns={FACE_COLUMNS} rows={FACE_ROWS} cells={frameCells(frame, hexColor(body), personality)} />
          <Text dimColor>{note === '' ? ' ' : note}</Text>
          <Text dimColor>cheer  {meter((cheer + 1) / 2)}</Text>
          <Text dimColor>energy {meter(energy)}</Text>
        </Box>
      )
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text color={color} weight="bold">
          {withBadge(frame.text, personality)}
        </Text>
        <Text dimColor>{note}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden)) || (await read($, isPaneShown))) return next(e)

    const { frame, note, color, body, personality } = await read($, shown)
    const hasRoom = e.props.maxRows >= FACE_ROWS && e.props.bodyColumns >= FACE_COLUMNS + MIN_NOTE_COLUMNS

    if (e.surface === 'terminal' && hasRoom) {
      const { Box, Raster, Text } = $.ui.resolve(e)

      return (
        <Box alignItems="center">
          <Raster key="face" columns={FACE_COLUMNS} rows={FACE_ROWS} cells={frameCells(frame, hexColor(body), personality)} />
          {note !== '' && <Text dimColor>{note}</Text>}
        </Box>
      )
    }

    // Surfaces without Raster, or a band too short for it, get the text face.
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color={color} weight="bold">
          {withBadge(frame.text, personality)}
        </Text>
        {note !== '' && <Text dimColor>{'  ' + note}</Text>}
      </Box>
    )
  })
}
