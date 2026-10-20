# mood-face

A Claude Code mod that adds a small pixel face to your session. It reacts to the conversation: it waves when you say hello, blushes when you say thanks, rolls its eyes when you repeat a question, sweats through long turns, flips the table after three failed tool calls, and falls asleep when you leave it alone.

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

Closing the corner pane by hand switches the face to the band above the prompt. Surfaces without pixel drawing, and bands too short for it, get a text face like `(•‿•)`.

## Uninstall

```sh
claude plugin uninstall mood-face
```

## Development

The hooks module is `hooks/register.tsx`; the pixel art is in `hooks/pixels.ts`.

```sh
claude plugin validate .
claude plugin test .
```

To run a working copy without installing it: `claude --plugin-dir /path/to/claude-mood-face`.
