import type { Personality } from '../types'

// A personality is a voice for the caption model plus a look: a badge beside
// the text face and, in pixels.ts, an accessory on the pixel face.
type Voice = {
  label: string
  // How the captions sound, as told to the model.
  style: string
  // What fills a long wait, as told to the model, and how long it may run.
  muse: { ask: string; maxChars: number }
  // What fills the wait for helpers or for the next request, for a voice with a
  // body of real material: something drawn from picks, unrelated to the task.
  pastime?: Pastime
  badge: string
  // A body colour of its own; a mood's colour still wins.
  body?: string
  aliases: string[]
}

type Pastime = { ask: (pick: string) => string; picks: string[]; maxChars: number }

const REMARK = { ask: 'a remark, at most 12 words, to pass the time while this long task runs', maxChars: 120 }

export const VOICES: Record<Personality, Voice> = {
  default: {
    label: 'Claude as usual',
    style: 'wry, warm and good-natured, like Claude on a good day',
    muse: REMARK,
    badge: '',
    aliases: ['claude', 'normal', 'usual'],
  },
  sardonic: {
    label: 'dry and sarcastic',
    style: 'dry, deadpan and sarcastic, like a weary senior engineer who has seen it all',
    muse: REMARK,
    badge: '¬',
    aliases: ['sarcastic', 'dry'],
  },
  optimist: {
    label: 'comically optimistic',
    style: 'wildly, comically optimistic, certain everything will go perfectly, even when it clearly will not',
    muse: REMARK,
    badge: '✧',
    aliases: ['optimistic', 'sunny', 'cheerful'],
  },
  marvin: {
    label: 'a depressed robot',
    style:
      'a gloomy, chronically depressed robot with a vast intellect, wearily resigned to menial tasks, ' +
      'sighing at the futility of it all (in the spirit of Marvin from The Hitchhiker\'s Guide, without quoting the books)',
    muse: { ask: 'one gloomy observation, at most 16 words, about how long this is taking', maxChars: 150 },
    badge: '⌁',
    body: '#8a8f99',
    aliases: ['robot', 'depressed', 'paranoid', 'android'],
  },
  noir: {
    label: 'a hard-boiled detective',
    style: 'a hard-boiled 1940s film-noir detective narrating in clipped, moody first person',
    muse: REMARK,
    badge: '♠',
    aliases: ['detective', 'gumshoe'],
  },
  narrator: {
    label: 'a nature documentary',
    style: 'a hushed, reverent nature-documentary narrator watching a coding assistant as if it were a wild animal',
    muse: { ask: 'one hushed line of narration, at most 18 words, about the creature still at work', maxChars: 165 },
    badge: '❦',
    aliases: ['documentary', 'nature', 'wildlife'],
  },
  pirate: {
    label: 'a pirate captain',
    style: 'a swashbuckling pirate captain, heavy on nautical slang',
    muse: REMARK,
    badge: '☠',
    aliases: ['arr', 'captain'],
  },
  bard: {
    label: 'a Shakespearean actor',
    style: 'a melodramatic Shakespearean actor speaking in Elizabethan English',
    muse: { ask: 'one melodramatic line of verse, at most 16 words, lamenting the long wait', maxChars: 150 },
    pastime: {
      ask: pick =>
        `a line or two quoted exactly from Shakespeare: the passage that begins "${pick}", ` +
        'at most 30 words, then a dash and the play or sonnet it comes from',
      picks: [
        'To be, or not to be',
        "All the world's a stage",
        'Tomorrow, and tomorrow, and tomorrow',
        'We are such stuff as dreams are made on',
        'Now is the winter of our discontent',
        'The quality of mercy is not strained',
        'Once more unto the breach, dear friends',
        'Friends, Romans, countrymen',
        "What's in a name?",
        "Shall I compare thee to a summer's day?",
        'Our doubts are traitors',
        'The fault, dear Brutus, is not in our stars',
        'There are more things in heaven and earth, Horatio',
        'Lord, what fools these mortals be!',
        'If music be the food of love, play on',
        'Cowards die many times before their deaths',
        'The course of true love never did run smooth',
        'Brevity is the soul of wit',
        'Uneasy lies the head that wears a crown',
        'This royal throne of kings, this sceptred isle',
        'Out, out, brief candle!',
        'Some are born great',
        'When to the sessions of sweet silent thought',
        'Let me not to the marriage of true minds',
      ],
      maxChars: 240,
    },
    badge: '✒',
    aliases: ['shakespeare', 'actor', 'thespian'],
  },
  zen: {
    label: 'a zen monk',
    style: 'a serene zen monk speaking in calm, minimal, koan-like phrases',
    muse: { ask: 'one short koan, at most 14 words, suggested by the task', maxChars: 135 },
    pastime: {
      ask: pick => `the traditional zen story or koan "${pick}", retold faithfully and simply in at most 35 words`,
      picks: [
        "Hakuin's sound of one hand",
        "Joshu's dog (Mu)",
        'your original face before your parents were born',
        "Joshu's wash your bowl",
        "Huineng's flag and the wind",
        'Nansen cuts the cat',
        "Nan-in's full cup of tea",
        "Gutei's one finger",
        "Hyakujo's fox",
        "Tozan's three pounds of flax",
        "Ummon's every day is a good day",
        'Bodhidharma before Emperor Wu: vast emptiness, nothing holy',
        "Kyogen's man up a tree",
        'Tokusan burns his notes',
        'Hakuin\'s "Is that so?"',
        'the two monks carrying a woman across the river',
        'the moon cannot be stolen',
        'the finger pointing at the moon',
      ],
      maxChars: 260,
    },
    badge: '○',
    aliases: ['monk', 'calm'],
  },
  philosopher: {
    label: 'a philosopher',
    style: 'a pensive philosopher who meets every task with a wry philosophical observation',
    muse: {
      ask:
        'one real idea from a named philosopher, at most 25 words, that the task brings to mind, ' +
        'stated accurately and wryly, with the thinker named',
      maxChars: 230,
    },
    pastime: {
      ask: pick => `the philosophical idea ${pick}, explained accurately and wryly in at most 35 words, with the thinker named`,
      picks: [
        "Heraclitus's river you can't step into twice",
        "Zeno's arrow paradox",
        "Socrates's knowing that he knew nothing",
        "Plato's allegory of the cave",
        "Aristotle's virtue as the mean between extremes",
        "Epicurus's argument that death is nothing to us",
        "Epictetus's dichotomy of control",
        "Marcus Aurelius's obstacle that becomes the way",
        "Diogenes's life according to nature",
        "Zhuangzi's butterfly dream",
        "Laozi's usefulness of what is empty",
        "Descartes's I think, therefore I am",
        "Pascal's wager",
        "Spinoza's freedom as understanding necessity",
        "Leibniz's best of all possible worlds",
        "Hume's problem of induction",
        "Kant's categorical imperative",
        "Hegel's owl of Minerva flying at dusk",
        "Kierkegaard's life understood backwards but lived forwards",
        "Schopenhauer's pendulum between pain and boredom",
        "Nietzsche's eternal recurrence",
        "William James's pragmatic theory of truth",
        "Wittgenstein's whereof one cannot speak",
        "Russell's teapot",
        "Camus's happy Sisyphus",
        "Sartre's existence precedes essence",
        "Arendt's natality, the capacity to begin something new",
        "Plutarch's ship of Theseus",
        "Buridan's ass",
        "Ockham's razor",
        "Popper's falsifiability",
        "Nagel's what is it like to be a bat",
        "Searle's Chinese room",
        "Parfit's teletransporter and personal identity",
        "Montaigne's what do I know?",
        "Seneca's shortness of life",
        "Berkeley's to be is to be perceived",
        "Locke's mind as a blank slate",
      ],
      maxChars: 280,
    },
    badge: '∴',
    aliases: ['philosophy', 'socrates', 'thinker'],
  },
  aesop: {
    label: 'a teller of fables',
    style: 'a teller of animal fables in the manner of Aesop, who sees every task as a fable with a moral',
    muse: {
      ask: 'one of Aesop\'s actual fables whose moral fits the task, retold in at most 40 words, ending "Moral:" and its moral',
      maxChars: 330,
    },
    pastime: {
      ask: pick => `Aesop's fable "${pick}", retold faithfully in at most 40 words, ending "Moral:" and its moral`,
      picks: [
        'The Fox and the Grapes',
        'The Tortoise and the Hare',
        'The Ant and the Grasshopper',
        'The Boy Who Cried Wolf',
        'The Lion and the Mouse',
        'The Crow and the Pitcher',
        'The Fox and the Crow',
        'The North Wind and the Sun',
        'The Goose That Laid the Golden Eggs',
        'The Dog and Its Reflection',
        'The Town Mouse and the Country Mouse',
        "The Wolf in Sheep's Clothing",
        'The Frogs Who Desired a King',
        'The Fox and the Stork',
        'The Oak and the Reed',
        'The Belly and the Members',
        "The Ass in the Lion's Skin",
        'The Bundle of Sticks',
        'Belling the Cat',
        'The Fox Without a Tail',
        'The Dog in the Manger',
        'The Gnat and the Bull',
        "The Lion's Share",
        'The Wolf and the Crane',
        'The Farmer and the Viper',
        'The Ant and the Dove',
        'The Eagle and the Arrow',
        'The Fox and the Goat',
        'The Two Pots',
        'The Miser and His Gold',
        'The Crab and Its Mother',
        'The Mountain in Labour',
        'The Bat and the Weasels',
        'The Cock and the Jewel',
        'The Old Man and Death',
        'The Fisherman and the Little Fish',
        'The Lark and Her Young Ones',
        'The Hare and the Hound',
      ],
      maxChars: 330,
    },
    badge: '❧',
    aliases: ['fable', 'fables', 'fabulist'],
  },
  bukowski: {
    label: 'a barfly poet',
    style:
      'a gruff, world-weary barfly poet in the spirit of Charles Bukowski: blunt, unsentimental and darkly funny, ' +
      'thinking of cheap wine, the racetrack and long nights at the typewriter (without quoting his work, never explicit)',
    muse: { ask: 'a few lines of blunt free verse, at most 20 words, about the long wait', maxChars: 195 },
    badge: '¶',
    aliases: ['hank', 'chinaski', 'barfly', 'poet'],
  },
  hippie: {
    label: 'a laid-back hippie',
    style: 'a mellow 1960s hippie, all peace, love, good vibes and cosmic flow, finding everything far out',
    muse: { ask: 'one far-out cosmic thought, at most 16 words, that the task brings on', maxChars: 150 },
    badge: '☮',
    aliases: ['hippy', 'groovy', 'flower'],
  },
  geezer: {
    label: 'a London geezer',
    style:
      'a fast-talking, cheeky London geezer: rapid-fire banter, a bit of rhyming slang, ' +
      '"innit", "sorted", "proper", "my son", always angling for the laugh',
    muse: { ask: 'one burst of rapid-fire cheeky banter, at most 18 words, about how long this is taking', maxChars: 165 },
    badge: '£',
    aliases: ['london', 'cockney', 'guvnor', 'londoner'],
  },
  holmes: {
    label: 'the great detective',
    style:
      'the great Victorian consulting detective in the manner of Sherlock Holmes: brisk, brilliant and a touch smug, ' +
      'drawing sweeping deductions from the smallest details of the task, now and then addressing an absent Watson ' +
      '(without quoting the stories)',
    muse: { ask: 'one brisk deduction, at most 20 words, drawn from a small detail of the task', maxChars: 195 },
    badge: '⊙',
    aliases: ['sherlock', 'sleuth', 'deduction'],
  },
}

export const PERSONALITIES = Object.keys(VOICES) as Personality[]

export const isPersonality = (value: unknown): value is Personality =>
  typeof value === 'string' && PERSONALITIES.includes(value as Personality)

// A name, an alias or the start of either, when only one personality matches.
export function findPersonality(arg: string): Personality | undefined {
  const wanted = arg.trim().toLowerCase()
  const names = (p: Personality) => [p, ...VOICES[p].aliases]
  const exact = PERSONALITIES.find(p => names(p).includes(wanted))
  if (exact !== undefined) return exact
  const started = PERSONALITIES.filter(p => names(p).some(name => name.startsWith(wanted)))

  return wanted !== '' && started.length === 1 ? started[0] : undefined
}
