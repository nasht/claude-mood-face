import { expect, mock, test } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

const BAND = {
  plugin: 'mood-face',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const DAY_MS = 24 * 60 * 60_000

type Asked = { prompt: string; system?: string }
type Setup = {
  store?: Record<string, unknown>
  isPaneShown?: boolean
  isToolOk?: boolean
  caption?: string
  asked?: Asked[]
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

async function start($: EngineInterface, on: On, setup: Setup = {}) {
  const clock = mock.clock(on)
  // A face seen recently: no first-meeting wave unless a test asks for one.
  mock.store(on, setup.store ?? { lastSeenAt: 0, placement: 'band' })
  const pane = { id: 'mood-face', title: 'Claude', isShown: true, isFocused: false, isPlaced: true }
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: setup.isPaneShown ? [pane] : [] }))
  on('command.register', () => ({ value: { command: 'face' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => (setup.isToolOk ? { result: {}, text: 'ok' } : { result: {}, text: 'boom', isError: true }))
  on('model.complete', (_, e) => {
    setup.asked?.push({ prompt: e.prompt, system: e.system })

    return { value: { isAnswered: true, text: setup.caption ?? '"Bold move, refactoring."', usage: USAGE } }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  return clock
}

// The desktop has no Raster, so it draws the text face these checks read.
async function faceText($: EngineInterface) {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const texts = [await ui.find({ type: 'Text', text: /\(/ }), await ui.find({ type: 'Text', text: /^ {2}/ })]
  await ui.unmount()

  return texts.map(t => t?.text ?? '').join('')
}

test('a repeated prompt gets an eye roll', async ($, on) => {
  const clock = await start($, on)
  await $.prompt.submit({ text: 'how do I run the backend tests' })
  await $.prompt.submit({ text: 'How do I run the backend tests?' })
  await clock.advance(700)

  expect(await faceText($)).toContain('you asked that already')
})

test('a long turn sweats, then three failures flip the table', async ($, on) => {
  const clock = await start($, on)
  await $.turn.start({ text: 'refactor everything', turnId: 't1' })
  await clock.advance(100_000)
  expect(await faceText($)).toContain(';)')

  for (let i = 0; i < 3; i += 1) await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.advance(700)
  expect(await faceText($)).toContain('┻━┻')
})

test('an eye roll plays once and holds its last frame', async ($, on) => {
  const clock = await start($, on)
  await $.prompt.submit({ text: 'what does the backend do' })
  await $.prompt.submit({ text: 'what does the backend do?' })

  const seen: string[] = []
  for (let i = 0; i < 20; i += 1) {
    await clock.advance(150)
    const face = (await faceText($)).split('  ')[0]!
    if (seen.at(-1) !== face) seen.push(face)
  }

  expect(seen).toEqual(['(•_•)', '(◐_◐)', '(◓_◓)', '(◑_◑)', '(-_-)'])
})

test('the terminal draws the pixel face, and it changes with the mood', async ($, on) => {
  const clock = await start($, on)
  const cells = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const face = await ui.find({ key: 'face' })
    await ui.unmount()

    return face?.props.cells
  }

  const idle = await cells()
  expect(typeof idle).toBe('string')

  await $.turn.start({ text: 'big job', turnId: 't1' })
  await clock.advance(100_000)
  expect(await cells()).not.toBe(idle)
})

test('a short band falls back to the text face', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, maxRows: 2 } })

  expect(await ui.find({ key: 'face' })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /\(/ }))?.text).toContain('(')
  await ui.unmount()
})

test('a greeting gets a wave, and meeting gets a shy hello', async ($, on) => {
  const clock = await start($, on)
  await $.prompt.submit({ text: 'hey there' })
  await clock.advance(200)
  expect(await faceText($)).toMatch(/ノ|\//)

  await $.prompt.submit({ text: 'nice to meet you' })
  await clock.advance(200)
  expect(await faceText($)).toContain('*')
})

test('kindness shows up in the temperament', async ($, on) => {
  const clock = await start($, on)
  const before = await $.command.run({ command: 'face', args: 'mood' })
  for (const text of ['thanks!', 'thank you so much', 'cheers, legend']) {
    await $.prompt.submit({ text })
    await clock.advance(200)
  }
  const after = await $.command.run({ command: 'face', args: 'mood' })

  expect(before.text).toContain('fine')
  expect(after.text).toContain('chipper')
})

test('a first meeting gets a hello', async ($, on) => {
  const clock = await start($, on, { store: { placement: 'band' } })
  await clock.advance(200)
  expect(await faceText($)).toContain("I'm Claude")
})

test('a long absence gets a welcome back', async ($, on) => {
  const clock = mock.clock(on)
  await clock.set(5 * DAY_MS)
  mock.store(on, { lastSeenAt: 0, placement: 'band' })
  on('ui.panes', () => ({ value: [] }))
  on('command.register', () => ({ value: { command: 'face' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(200)

  expect(await faceText($)).toContain('long time no see')
})

test('the band steps aside while the corner pane shows', async ($, on) => {
  // Stands for the engine's own band, which the mod hands back to.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  const clock = await start($, on, { store: { lastSeenAt: 0 }, isPaneShown: true })
  await clock.advance(1_100)

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ key: 'face' })).toBeUndefined()
  await band.unmount()

  const pane = await $.ui.mount({
    plugin: 'mood-face',
    component: 'Pane',
    requestId: 'mood-face',
    surface: 'terminal',
    props: { title: 'Claude', isFocused: false, bodyColumns: 22, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
  })
  expect(await pane.find({ key: 'face' })).toBeDefined()
  expect((await pane.find({ type: 'Text', text: /energy/ }))?.text).toContain('▮')
  await pane.unmount()
})

const PANE = {
  plugin: 'mood-face',
  component: 'Pane',
  requestId: 'mood-face',
  surface: 'terminal',
  props: { title: 'Claude', isFocused: false, bodyColumns: 22, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

async function paneCells($: EngineInterface) {
  const pane = await $.ui.mount(PANE)
  const face = await pane.find({ key: 'face' })
  await pane.unmount()

  return face?.props.cells
}

test('a tool call gets a caption from the model, told what is happening', async ($, on) => {
  const asked: Asked[] = []
  const clock = await start($, on, { isToolOk: true, asked })
  await $.turn.start({ text: 'find it', turnId: 't1' })
  await $.tool.call({ tool: 'Grep', pattern: 'parseConfig' })
  await clock.advance(500)

  expect(await faceText($)).toContain('bold move, refactoring')
  expect(asked.at(-1)?.prompt).toContain('Right now: searching for "parseConfig"')
})

test('the model is told what it already said', async ($, on) => {
  const asked: Asked[] = []
  const clock = await start($, on, { isToolOk: true, asked, caption: 'grep, my old friend' })
  await $.turn.start({ text: 'fix it', turnId: 't1' })
  await $.tool.call({ tool: 'Read', file_path: '/src/app.ts' })
  await clock.advance(31_000)
  await $.tool.call({ tool: 'Read', file_path: '/src/other.ts' })
  await clock.advance(500)

  expect(asked).toHaveLength(2)
  expect(asked[1]?.prompt).toContain('Already said, so do not repeat or echo: grep, my old friend')
})

test('tool calls in quick succession get one caption, not one each', async ($, on) => {
  const asked: Asked[] = []
  const clock = await start($, on, { isToolOk: true, asked })
  await $.turn.start({ text: 'fix it', turnId: 't1' })
  for (const file of ['a', 'b', 'c', 'd']) {
    await $.tool.call({ tool: 'Read', file_path: `/src/${file}.ts` })
    await clock.advance(4_000)
  }

  expect(asked).toHaveLength(1)
})

test('with quips off, the caption says what Claude is doing and nothing is asked', async ($, on) => {
  const asked: Asked[] = []
  const clock = await start($, on, { isToolOk: true, asked, store: { lastSeenAt: 0, placement: 'band', quips: false } })
  await $.turn.start({ text: 'fix it', turnId: 't1' })
  for (let i = 0; i < 3; i += 1) {
    await $.tool.call({ tool: 'Edit', file_path: '/src/app.ts', old_string: 'a', new_string: 'b' })
  }
  await clock.advance(300)

  expect(await faceText($)).toContain('editing app.ts (take 3)')
  expect(asked).toHaveLength(0)
})

test('a failing tool still shows the emotion over the caption', async ($, on) => {
  const clock = await start($, on)
  await $.turn.start({ text: 'run them', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await clock.advance(200)

  expect(await faceText($)).toContain('ಠ_ಠ')
})

test('a task prompt gets a quip, and /face quips turns them off', async ($, on) => {
  const asked: Asked[] = []
  const clock = await start($, on, { asked })
  await $.prompt.submit({ text: 'refactor the settlement engine please' })
  await $.turn.start({ text: 'refactor the settlement engine please', turnId: 't1' })
  await clock.advance(500)
  expect(await faceText($)).toContain('bold move, refactoring')
  expect(asked.at(-1)?.prompt).toContain('refactor the settlement engine')

  await $.command.run({ command: 'face', args: 'quips' })
  await $.turn.complete({ turnId: 't1', reason: 'answer' })
  await $.prompt.submit({ text: 'now rename every variable in it' })
  await $.turn.start({ text: 'now rename every variable in it', turnId: 't2' })
  await clock.advance(500)
  expect(asked).toHaveLength(1)
})

test('small talk gets a reaction and no model call', async ($, on) => {
  const asked: Asked[] = []
  const clock = await start($, on, { asked })
  await $.prompt.submit({ text: 'thanks so much for that' })
  await clock.advance(500)

  expect(asked).toHaveLength(0)
})

test('a long quiet turn gets a fable from Aesop', async ($, on) => {
  const asked: Asked[] = []
  const fable = 'A tortoise ran the tests twice. Moral: slow builds still finish.'
  const clock = await start($, on, { asked, caption: fable })
  await $.command.run({ command: 'face', args: 'personality aesop' })
  await $.turn.start({ text: 'migrate the database', turnId: 't1' })
  await clock.advance(46_000)

  expect(asked.at(-1)?.system).toContain('Aesop')
  expect(asked.at(-1)?.prompt).toContain('fable')
  expect(await faceText($)).toContain('Moral: slow builds')
})

test('a personality is found by prefix, greets in its voice and wears its flourish', async ($, on) => {
  const clock = await start($, on, { caption: 'what is a face, really' })
  const plainCells = await paneCells($)

  const unknown = await $.command.run({ command: 'face', args: 'personality clown' })
  expect(unknown.text).toContain('aesop')

  const chosen = await $.command.run({ command: 'face', args: 'personality phil' })
  expect(chosen.text).toContain('philosopher')
  await clock.advance(500)

  expect(await faceText($)).toContain('∴')
  expect(await faceText($)).toContain('what is a face, really')
  expect(await paneCells($)).not.toBe(plainCells)
})
