// What a tool call is doing, in plain words: what the caption model is told,
// and the caption itself when generated captions are off.

type Input = Record<string, unknown>

export type Topic =
  | 'read'
  | 'edit'
  | 'write'
  | 'grep'
  | 'glob'
  | 'look'
  | 'tests'
  | 'install'
  | 'build'
  | 'lint'
  | 'git'
  | 'commit'
  | 'delete'
  | 'web'
  | 'websearch'
  | 'delegate'
  | 'plan'
  | 'ask'
  | 'run'

// `x` is what the call acts on; `n` how many times this turn, once it repeats.
export type Subject = { topic: Topic; x: string; n?: number }

const PLAIN: Record<Topic, string> = {
  read: 'reading {x}',
  edit: 'editing {x}',
  write: 'writing {x}',
  grep: 'searching for "{x}"',
  glob: 'finding {x}',
  look: 'looking around',
  tests: 'running the tests',
  install: 'installing packages',
  build: 'building',
  lint: 'linting',
  git: 'checking git',
  commit: 'committing',
  delete: 'deleting files',
  web: 'reading {x}',
  websearch: 'searching the web for "{x}"',
  delegate: 'handing off: {x}',
  plan: 'updating the to-do list',
  ask: 'asking you a question',
  run: 'running {x}',
}

export const plain = ({ topic, x, n }: Subject) => PLAIN[topic].replace('{x}', x) + (n === undefined ? '' : ` (take ${n})`)

const MAX_NAME = 18

const text = (input: Input, key: string) => (typeof input[key] === 'string' ? (input[key] as string).trim() : '')
export const clip = (value: string, max = MAX_NAME) => (value.length > max ? value.slice(0, max - 1) + '…' : value)
const basename = (path: string) => clip(path.split('/').filter(Boolean).at(-1) ?? path)

const host = (url: string) => {
  const match = /[a-z]+:\/\/([^/\s]+)/i.exec(url)

  return clip(match?.[1]?.replace(/^www\./, '') ?? 'the web')
}

const TESTS = /\b(test|tests|jest|vitest|pytest|rspec|mocha)\b|\bgo test\b|\bcargo test\b/
const INSTALL = /\b(npm (i|install|ci)|yarn( add| install)?|pnpm (i|install|add)|bun (i|install|add)|pip3? install|brew install|bundle install|cargo add|go get)\b/
const BUILD = /\b(build|tsc|make|compile|webpack|cargo build|go build)\b/
const LINT = /\b(lint|eslint|prettier|rubocop|ruff|biome|fmt)\b/

function bash(command: string): Subject {
  const words = command.split(/\s+/)
  const first = clip(words[0] ?? 'something', 12)

  if (TESTS.test(command)) return { topic: 'tests', x: first }
  if (INSTALL.test(command)) return { topic: 'install', x: first }
  if (BUILD.test(command)) return { topic: 'build', x: first }
  if (LINT.test(command)) return { topic: 'lint', x: first }
  if (/^git\s+(commit|push)/.test(command)) return { topic: 'commit', x: first }
  if (/^git\b/.test(command)) return { topic: 'git', x: first }
  if (/^(rm|rmdir)\b/.test(command)) return { topic: 'delete', x: first }
  if (/^(ls|find|tree|pwd)\b/.test(command)) return { topic: 'look', x: first }
  if (/^(cat|head|tail|less|sed -n)\b/.test(command)) return { topic: 'read', x: basename(words.at(-1) ?? 'a file') }
  if (/^(curl|wget)\b/.test(command)) return { topic: 'web', x: host(command) }

  return { topic: 'run', x: first }
}

// MCP tools arrive as mcp__server__tool_name.
const toolName = (tool: string) => clip((tool.split('__').at(-1) ?? tool).replace(/_/g, ' '))

export function describe(tool: string, input: Input): Subject {
  const file = basename(text(input, 'file_path') || text(input, 'notebook_path') || 'a file')
  const pattern = clip(text(input, 'pattern'))

  switch (tool) {
    case 'Read':
      return { topic: 'read', x: file }
    case 'Edit':
    case 'NotebookEdit':
      return { topic: 'edit', x: file }
    case 'Write':
      return { topic: 'write', x: file }
    case 'Grep':
      return { topic: 'grep', x: pattern }
    case 'Glob':
      return { topic: 'glob', x: pattern }
    case 'Bash':
      return bash(text(input, 'command'))
    case 'WebFetch':
      return { topic: 'web', x: host(text(input, 'url')) }
    case 'WebSearch':
      return { topic: 'websearch', x: clip(text(input, 'query')) }
    case 'Agent':
    case 'Task':
      return { topic: 'delegate', x: clip(text(input, 'description'), 24) }
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
      return { topic: 'plan', x: '' }
    case 'AskUserQuestion':
      return { topic: 'ask', x: '' }
    case 'Skill':
      return { topic: 'read', x: 'the manual' }
    default:
      return { topic: 'run', x: toolName(tool) }
  }
}

// The key repeats are counted under, or undefined for calls that don't count.
export function target(tool: string, input: Input): string | undefined {
  if (tool === 'Edit' || tool === 'Write') return `Edit:${text(input, 'file_path')}`
  if (tool === 'Bash' && TESTS.test(text(input, 'command'))) return 'Bash:tests'

  return undefined
}

// The model's reply as a caption: its lines run together, unquoted, and cut at
// a word if it runs past the room.
export function cleanReply(reply: string, max: number, isLowered: boolean): string | undefined {
  const line = reply
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\.$/, '')
    .trim()

  if (line === '') return undefined
  const text = isLowered ? line.toLowerCase() : line
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')

  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '') + '…'
}
