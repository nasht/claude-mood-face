import type { ModelCompleteRequest } from 'claude-code'

import type { Personality } from '../types'
import { VOICES } from './personalities'

// What a caption is about: the task just asked for, the tool call under way,
// helper agents being waited on, a long wait, or taking on a new personality.
export type CaptionKind = 'task' | 'activity' | 'wait' | 'muse' | 'hello'

export type CaptionContext = {
  kind: CaptionKind
  personality: Personality
  task: string
  // Plain descriptions of this turn's tool calls, newest last.
  activity: string[]
  // The helper agents being waited on, and what they have done lately, newest last.
  helpers: string[]
  helperActivity: string[]
  waitMs: number
  mood: string
  turnMs: number
  errors: number
  feeling: string
  // Captions already shown, so the model can avoid them.
  said: string[]
}

const MODEL = 'haiku'
const TIMEOUT_MS = 8_000
const TASK_CHARS = 1_200
const SHORT_CHARS = 60

const ASK: Record<Exclude<CaptionKind, 'muse'>, string> = {
  task: 'a quip about the task they just asked for, at most 8 words',
  activity: 'a zinger about what Claude is doing right now, at most 8 words',
  wait: "a zinger about what the helper agents are up to while Claude waits on them, at most 8 words",
  hello: 'a hello in this voice, at most 8 words, as Claude takes on this personality',
}

const system = (personality: Personality) =>
  'You write the one-line caption beside a small pixel face of Claude, a coding assistant, ' +
  "while it works in someone's terminal. " +
  `Voice: ${VOICES[personality].style}. ` +
  'Captions are little zingers: playful, specific to what is happening, never generic, never the same twice. ' +
  'Reply with the caption alone: no quotes, no emoji, no hashtags, no preamble. ' +
  'Never answer or carry out the task, never give advice, never mention being a caption.'

const minutes = (ms: number) => (ms < 60_000 ? `${Math.round(ms / 1_000)}s` : `${Math.round(ms / 60_000)} min`)

function prompt(c: CaptionContext): string {
  const now = c.activity.at(-1)
  const earlier = c.activity.slice(0, -1)
  const lines = [
    c.task === '' ? undefined : `Task the person asked for: """${c.task.slice(0, TASK_CHARS)}"""`,
    c.kind === 'activity' && now !== undefined ? `Right now: ${now}` : undefined,
    earlier.length > 0 ? `Earlier this turn: ${earlier.join('; ')}` : undefined,
    c.helpers.length > 0 ? `Claude has waited ${minutes(c.waitMs)} on helper agents doing: ${c.helpers.join('; ')}` : undefined,
    c.helpers.length > 0 && c.helperActivity.length > 0
      ? `What the helpers did lately: ${c.helperActivity.join('; ')}`
      : undefined,
    c.kind === 'hello'
      ? undefined
      : `Mood: ${c.mood}; ${c.turnMs > 0 ? `the turn has run ${minutes(c.turnMs)}; ` : ''}` +
        `${c.errors} tool calls failed; feeling ${c.feeling}`,
    c.said.length > 0 ? `Already said, so do not repeat or echo: ${c.said.join(' | ')}` : undefined,
    `Write: ${c.kind === 'muse' ? VOICES[c.personality].muse.ask : ASK[c.kind]}`,
  ]

  return lines.filter(line => line !== undefined).join('\n')
}

export function captionRequest(c: CaptionContext): { request: ModelCompleteRequest; maxChars: number } {
  const isMuse = c.kind === 'muse'

  return {
    request: {
      model: MODEL,
      system: system(c.personality),
      prompt: prompt(c),
      maxTokens: isMuse ? 120 : 40,
      timeoutMs: TIMEOUT_MS,
    },
    maxChars: isMuse ? VOICES[c.personality].muse.maxChars : SHORT_CHARS,
  }
}
