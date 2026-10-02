# Five Letters

A Wordle-style word game in plain HTML, CSS and JavaScript. No build step, no dependencies.

## Play

Download **`wordle.html`** and double-click it. It's a single self-contained file
that opens in any browser, offline, with no other files needed.

To work on the source, open `index.html` (it needs the `js/` folder and
`style.css` next to it), or serve the folder:

```sh
npm start   # python3 -m http.server 8000, then visit http://localhost:8000
```

After changing the source, rebuild the single file with `npm run build`.

## Features

- New daily word at local midnight; progress is saved in `localStorage`
- On-screen and physical keyboard input
- Wordle's rules for repeated letters (exact matches claimed first)
- Tile flip, shake and win bounce animations
- Statistics: games played, win %, streaks, guess distribution
- Share results as an emoji grid
- Unlimited practice words once the daily puzzle is done (not counted in stats)
- Settings: hard mode and high-contrast colours; light/dark follows your system theme

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and dialogs |
| `style.css` | Styles and animations |
| `js/logic.js` | Pure game logic (scoring, daily word, hard mode, share text) |
| `js/game.js` | UI, input handling and persistence |
| `js/words.js` | Answer list and accepted guesses |
| `build.js` | Bundles everything into `wordle.html` |
| `wordle.html` | Generated single-file build |
| `test/` | Node unit tests for the logic |

## Tests

```sh
npm test
```

## Word lists

The answers are a curated list of common five-letter words. Extra accepted guesses
come from the MIT-licensed [`word-list`](https://github.com/sindresorhus/word-list)
package by Sindre Sorhus.
