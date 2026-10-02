# Wordle Clone

A Wordle clone in plain HTML, CSS and JavaScript. No build step, no dependencies.

## Play

Open `index.html` in a browser, or serve the folder:

```sh
npm start   # python3 -m http.server 8000, then visit http://localhost:8000
```

## Features

- New daily word at local midnight; progress is saved in `localStorage`
- On-screen and physical keyboard input
- Wordle's rules for repeated letters (exact matches claimed first)
- Tile flip, shake and win bounce animations
- Statistics: games played, win %, streaks, guess distribution
- Share results as an emoji grid
- Unlimited practice words once the daily puzzle is done (not counted in stats)
- Settings: hard mode, dark theme, high-contrast colours

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and dialogs |
| `style.css` | Styles and animations |
| `js/logic.js` | Pure game logic (scoring, daily word, hard mode, share text) |
| `js/game.js` | UI, input handling and persistence |
| `js/words.js` | Answer list and accepted guesses |
| `test/` | Node unit tests for the logic |

## Tests

```sh
npm test
```

## Word lists

The answers are a curated list of common five-letter words. Extra accepted guesses
come from the MIT-licensed [`word-list`](https://github.com/sindresorhus/word-list)
package by Sindre Sorhus.
