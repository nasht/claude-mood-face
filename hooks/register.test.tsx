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

type Setup = { store?: Record<string, unknown>; isPaneShown?: boolean }

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
  on('tool.call', () => ({ result: {}, text: 'boom', isError: true }))
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
