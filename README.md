# AoC Playground

A **local, open source** playground for [Advent of Code](https://adventofcode.com): see your stars, read each day's puzzle, write your solution in JavaScript or Python right in the app, run it against the example or your input, and submit the answer, all in one place.

> Unofficial project, not affiliated with Advent of Code or Eric Wastl. Puzzle text and inputs belong to AoC: the app downloads them with **your** account, keeps them on your machine only, and never commits them.

## Getting started

Requires Node.js 20.12 or later and [pnpm](https://pnpm.io) (`corepack enable` sets it up).

```bash
git clone https://github.com/DiegoLSdev/advent-of-code-playground
cd advent-of-code-playground
pnpm install
pnpm dev
```

Open <http://localhost:5173> and, under **[Settings]**, paste:

1. **Your `session` cookie** from adventofcode.com: log in → DevTools (F12) → Application → Cookies → `session`.
2. **Your contact** (email or GitHub username). AoC asks automated tools to identify themselves in the User-Agent.

You can also put both in a `.env` file (see `.env.example`).

To run it without dev mode, `pnpm start` builds everything and serves it at <http://localhost:3001>.

## Features

- **Stars** for every year and day, synced with your account.
- **Puzzle text** for part 1 and part 2 (once unlocked), with the answers you already got accepted.
- **Editor** for JavaScript and Python (real Python via [Pyodide](https://pyodide.org), in the browser).
- **Data as files:** your solution reads `input.txt` and `example.txt` as if they sat next to it, and you choose which one each part uses:

  ```python
  input = Path("input.txt").read_text()
  example = Path("example.txt").read_text()

  def part1():
      lines = example.strip().splitlines()   # switch to `input` when ready
  ```

  Hover `input` / `example` in the code to see what they hold and highlight their tab. Each part shows a badge with the data it reads.
- **Checks** the example result against the answer detected in the puzzle, and your input result against your accepted answer, without submitting anything.
- **Submit** answers to AoC from the app.
- **Watch mode:** `Ctrl+S` saves and re-runs whatever you ran last (part 1, part 2 or both), like nodemon. `Ctrl+Enter` just runs.
- **Resizable layout:** drag the dividers. Double-click the horizontal one, or use *Focus output*, to give the console the whole column.
- Solutions are plain files in `solutions/YEAR/dayDD/solution.EXT`. The folder is git-ignored here; copy it to your own repo if you want to version it.

## Being a good AoC citizen

- All requests go through a single queue, at most one per second.
- Inputs are downloaded **once** and cached in `.data/cache`.
- Stars and unfinished puzzles are refreshed at most every 15 minutes (once a minute when forced).
- `.data/` (cookie, puzzle text, inputs) is in `.gitignore`. Never publish it.
- The server only listens on `127.0.0.1` and rejects requests from other websites.

## Project layout

```
shared/      Calendar rules, language catalog and shared types
server/      Local API (Hono): AoC client, HTML parsing, cache and solutions
web/         Frontend (React + Vite + CodeMirror)
  src/runners/   One runner per language (Web Workers)
solutions/   Your code (created as you write, git-ignored)
.data/       Cookie and personal cache (git-ignored)
```

## Adding a language

Each language is a catalog entry plus a *runner* implementing `run()` and `stop()` (`web/src/runners/types.ts`).

1. Add it to `shared/languages.ts` (id, name, extension, mode and a template that reads `input.txt` / `example.txt` and defines `part1` and `part2`).
2. Add its highlighting in `web/src/editorLanguages.ts` (`@codemirror/lang-*` packages).
3. Register its runner in `web/src/runners/index.ts`:
   - **`browser`**: a Web Worker that receives `{ id, code, files, part }`, exposes `files` as files in the working directory, and answers with `log` and `done` messages (copy `javascript.worker.ts` or `python.worker.ts`). Works for languages with a WebAssembly build (Ruby, Lua, PHP…).
   - **`native`** (planned, for Rust, Go, C++…): a runner that sends the code to the local server, which writes the files to a temp folder and runs it with your installed toolchain.

## Contributing

Contributions are very welcome, from bug reports to new languages. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Built with AI

Most of this code was written with AI assistance ([Claude Code](https://claude.com/claude-code)), guided, tested and reviewed by a human. It works, but read it with a critical eye, and if you spot something odd, open an issue. More details in [CONTRIBUTING.md](CONTRIBUTING.md#about-ai-in-this-project).

## License

[MIT](LICENSE)
