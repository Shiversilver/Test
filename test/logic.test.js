const test = require("node:test");
const assert = require("node:assert");
const L = require("../js/logic.js");
const { ANSWERS, EXTRA_GUESSES } = require("../js/words.js");

const short = (r) => r.map((s) => ({ correct: "G", present: "Y", absent: "-" })[s]).join("");

test("exact match is all correct", () => {
  assert.strictEqual(short(L.evaluateGuess("crane", "crane")), "GGGGG");
});

test("misplaced and absent letters", () => {
  assert.strictEqual(short(L.evaluateGuess("react", "crane")), "YYGY-");
});

test("repeated guess letter only counts available copies", () => {
  // answer has one L; the exact match claims it
  assert.strictEqual(short(L.evaluateGuess("hello", "world")), "---GY");
  // answer has two Es: one exact match, so only one misplaced E gets yellow
  assert.strictEqual(short(L.evaluateGuess("eerie", "theme")), "Y---G");
  assert.strictEqual(short(L.evaluateGuess("eerie", "crane")), "--Y-G");
});

test("green takes priority over an earlier yellow", () => {
  assert.strictEqual(short(L.evaluateGuess("speed", "abide")), "--Y-Y");
  assert.strictEqual(short(L.evaluateGuess("lolly", "allow")), "YYG--");
});

test("keyboard keeps best state", () => {
  const g = ["llama", "allow"];
  const e = g.map((w) => L.evaluateGuess(w, "allow"));
  assert.strictEqual(L.keyboardStates(g, e).l, "correct");
});

test("hard mode enforces hints", () => {
  const g = ["crane"];
  const e = [L.evaluateGuess("crane", "cargo")];
  assert.match(L.hardModeViolation("blimp", g, e), /1st letter must be C/);
  assert.match(L.hardModeViolation("cloud", g, e), /must contain R/);
  assert.strictEqual(L.hardModeViolation("carry", g, e), null);
});

test("daily answer is deterministic and valid", () => {
  const d = L.dayNumber(new Date(2026, 9, 2));
  assert.strictEqual(L.answerForDay(d, ANSWERS), L.answerForDay(d, ANSWERS));
  assert.ok(ANSWERS.includes(L.answerForDay(d, ANSWERS)));
  assert.strictEqual(L.dayNumber(new Date(2026, 0, 1, 23, 59)), 0);
});

test("word lists are well formed", () => {
  for (const w of ANSWERS.concat(EXTRA_GUESSES)) assert.match(w, /^[a-z]{5}$/);
  assert.strictEqual(new Set(ANSWERS).size, ANSWERS.length);
});

test("share text", () => {
  const t = L.shareText(5, ["crane"], [L.evaluateGuess("crane", "crane")], true, false);
  assert.strictEqual(t, "Wordle Clone 5 1/6\n\n🟩🟩🟩🟩🟩");
});
