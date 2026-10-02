// Pure game logic, shared by the browser and the Node tests.

var WORD_LENGTH = 5;
var MAX_GUESSES = 6;

// Score a guess against the answer. Returns an array of
// "correct" | "present" | "absent", handling repeated letters the way
// Wordle does: exact matches are claimed first, then remaining letters
// are marked "present" only while unclaimed copies are left in the answer.
function evaluateGuess(guess, answer) {
  var result = new Array(WORD_LENGTH).fill("absent");
  var remaining = {};

  for (var i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
  }
  for (var j = 0; j < WORD_LENGTH; j++) {
    if (result[j] === "correct") continue;
    if (remaining[guess[j]] > 0) {
      result[j] = "present";
      remaining[guess[j]]--;
    }
  }
  return result;
}

// Days since a fixed epoch in the player's local time zone.
function dayNumber(date) {
  var epoch = new Date(2026, 0, 1);
  var local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((local - epoch) / 86400000);
}

// Deterministically map a day to an answer so the daily order isn't alphabetical.
function answerForDay(day, answers) {
  var h = (day + 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return answers[h % answers.length];
}

// Rank used to keep the best known state for each keyboard key.
var STATE_RANK = { absent: 1, present: 2, correct: 3 };

function keyboardStates(guesses, evaluations) {
  var states = {};
  guesses.forEach(function (guess, row) {
    for (var i = 0; i < guess.length; i++) {
      var letter = guess[i];
      var state = evaluations[row][i];
      if (!states[letter] || STATE_RANK[state] > STATE_RANK[states[letter]]) {
        states[letter] = state;
      }
    }
  });
  return states;
}

// In hard mode, revealed hints must be used in later guesses.
// Returns an error message, or null if the guess is allowed.
function hardModeViolation(guess, guesses, evaluations) {
  var ordinals = ["1st", "2nd", "3rd", "4th", "5th"];
  for (var row = 0; row < guesses.length; row++) {
    var prev = guesses[row];
    var evals = evaluations[row];
    for (var i = 0; i < WORD_LENGTH; i++) {
      if (evals[i] === "correct" && guess[i] !== prev[i]) {
        return ordinals[i] + " letter must be " + prev[i].toUpperCase();
      }
    }
    for (var k = 0; k < WORD_LENGTH; k++) {
      if (evals[k] === "present" && guess.indexOf(prev[k]) === -1) {
        return "Guess must contain " + prev[k].toUpperCase();
      }
    }
  }
  return null;
}

function shareText(day, guesses, evaluations, won, hardMode) {
  var emoji = { correct: "🟩", present: "🟨", absent: "⬛" };
  var header = "Five Letters " + day + " " + (won ? guesses.length : "X") + "/" + MAX_GUESSES + (hardMode ? "*" : "");
  var rows = evaluations.map(function (row) {
    return row.map(function (s) { return emoji[s]; }).join("");
  });
  return header + "\n\n" + rows.join("\n");
}

if (typeof module !== "undefined") {
  module.exports = {
    WORD_LENGTH, MAX_GUESSES, evaluateGuess, dayNumber, answerForDay,
    keyboardStates, hardModeViolation, shareText,
  };
}
