# mood-face

A Claude Code mod that adds a small pixel face to your session. It reacts to the conversation: it waves when you say hello, blushes when you say thanks, rolls its eyes when you repeat a question, sweats through long turns, flips the table after three failed tool calls, and falls asleep when you leave it alone.

While Claude works, the caption makes little jokes about the task. Haiku writes each one from the task you asked for, what Claude is doing right now (editing `app.ts` for the third time, running the tests), how the turn is going and the last few captions, so it doesn't repeat itself. Long, quiet stretches get something longer, such as an idea from the philosopher or a fable from Aesop. Emotions still take over when they apply: a failed tool gets a glare whatever the caption says.

The captions cost one small model call at most every 3 seconds during a turn, with up to 10 long-wait pieces per turn. While Claude waits on subagents, the face looks about, shows what they are doing, and gets a caption about their work every 12 seconds or so (up to 30 per wait, every fourth one a long-wait piece). Greetings and thanks are skipped. `/face quips rare` halves how often captions come and `/face quips chatty` doubles it; `/face quips normal` restores the times above. `/face quips off` (or `/face quips` alone, which toggles) turns the model calls off, and the caption then says what Claude is doing in plain words.

## Personalities

`/face personality <name>` picks the captions' voice and gives the face an accessory to match. Prefixes and aliases work too (`/face personality phil`, `/face personality robot`).

| Name | Voice | Flourish |
| --- | --- | --- |
| `default` | Claude as usual | none |
| `sardonic` | dry and sarcastic | one raised eyebrow |
| `optimist` | comically optimistic | a sparkle |
| `marvin` | a depressed robot with a brain far too large for this | steel-grey body and rivets |
| `noir` | a hard-boiled detective | a fedora |
| `narrator` | a hushed nature documentary | a pith helmet |
| `pirate` | a pirate captain | a bandana and eyepatch |
| `bard` | a melodramatic Shakespearean actor | a feathered beret |
| `zen` | a zen monk; long waits get koans | a gold dot |
| `philosopher` | a philosopher; long waits get ideas | a beard |
| `aesop` | a teller of fables; long waits get fables | a laurel wreath |
| `bukowski` | a gruff barfly poet; long waits get free verse | a cigarette |
| `hippie` | a laid-back hippie; long waits get cosmic thoughts | a headband and flower |
| `geezer` | a fast-talking London geezer | a flat cap |

Surfaces that draw the text face show a badge beside it instead (`(•‿•) ☠`).

It also keeps a temperament (cheer and energy) across sessions. Kindness cheers it up, long turns tire it out, and rest brings its energy back.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install mood-face --marketplace nasht/claude-mood-face
```

Answer `y` to add the marketplace, then press Enter to install at the user scope. The face appears straight away and loads in every session you start from then on.

From a shell:

```sh
claude plugin install mood-face --marketplace nasht/claude-mood-face
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `nasht/claude-mood-face`, then **Add plugin**.

## Use

| Command | What it does |
| --- | --- |
| `/face` | Hide or show the face |
| `/face corner` | Show the face in a pane beside the transcript (the default; the pane needs a wide terminal) |
| `/face band` | Show the face in a row above the prompt |
| `/face mood` | Show the current cheer and energy |
| `/face quips` | Turn the model-written captions off or on; `rare`, `normal` or `chatty` sets how often they come |
| `/face personality` | List the personalities, or pick one with `/face personality <name>` |

Closing the corner pane by hand switches the face to the band above the prompt. Surfaces without pixel drawing, and bands too short for it, get a text face like `(•‿•)`.

## Uninstall

```sh
claude plugin uninstall mood-face
```

## Development

The hooks module is `hooks/register.tsx`; the pixel art is in `hooks/pixels.ts`; the caption prompt is in `hooks/captions.ts`, the personalities in `hooks/personalities.ts`, and the plain description of each tool call in `hooks/zingers.ts`.

```sh
claude plugin validate .
claude plugin test .
```

To run a working copy without installing it: `claude --plugin-dir /path/to/claude-mood-face`.
