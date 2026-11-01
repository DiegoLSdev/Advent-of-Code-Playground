# Contributing to AoC Playground

Thanks for stopping by! This is a small community project made for fun, by people who enjoy Advent of Code. Every kind of help is welcome: bug reports, ideas, docs, new languages, UI polish, or just telling us what felt awkward.

## About AI in this project

Being upfront: **most of the code in this repository was written with AI assistance** ([Claude Code](https://claude.com/claude-code)), guided, tested and reviewed by a human.

What that means for you:

- **Read it with a critical eye.** The code works and was tested, but it can have rough edges or odd choices. If something looks wrong, it may well be wrong. Please open an issue or a PR.
- **You can use AI too.** AI-assisted contributions are welcome, as long as **you** understand, test and stand behind what you submit. Mention it in the PR so reviewers know.
- **Humans decide.** Every change is reviewed by a person before it is merged.

## Ground rules

- **Never commit Advent of Code content.** No puzzle text, no inputs, no cookies. AoC asks people not to redistribute them, and this project respects that. `.data/`, `.env` and `solutions/` are git-ignored for this reason; don't force-add them, and don't paste inputs into issues or tests.
- **Be nice to AoC's servers.** Keep requests going through the queue in `server/aoc.ts` (one per second at most, with caching). Don't add features that poll or scrape aggressively.
- **Be kind to people.** Assume good intent, be patient with beginners, and keep discussions friendly. Harassment of any kind is not welcome.

## Getting set up

```bash
git clone <your fork>
cd advent-of-code-playground
pnpm install
pnpm dev
```

See the [README](README.md) for how to connect your AoC account. Before opening a PR, run:

```bash
pnpm typecheck
pnpm build
```

## How to contribute

1. **Small fix?** Just open a PR.
2. **Bigger change or new feature?** Open an issue first so we can agree on the approach before you spend time on it.
3. Keep PRs focused: one change per PR is easier to review.
4. Describe what you changed and how you tested it. Screenshots help a lot for UI changes.
5. Match the style of the surrounding code (names, comments, structure).

## Good first contributions

- **A new language.** The README has a short [Adding a language](README.md#adding-a-language) guide. Languages with a WebAssembly build (Ruby, Lua, PHP…) can run in the browser like Python does.
- **Native runners** (Rust, Go, C++…) that use the toolchain installed on your machine.
- **Accessibility and UX** improvements: keyboard navigation, contrast, small screens.
- **Docs**: clearer setup steps, troubleshooting, translations of the README.

## Reporting bugs

Open an issue with:

- What you did, what you expected, and what happened.
- Your OS, browser and Node.js version.
- Any console or terminal errors (**remove your cookie** if it appears anywhere).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
