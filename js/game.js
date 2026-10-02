// Browser UI: board, keyboard, dialogs, persistence.
(function () {
  "use strict";

  var VALID = new Set(ANSWERS.concat(EXTRA_GUESSES));
  var FLIP_STAGGER = 300;
  var FLIP_DURATION = 500;
  var WIN_MESSAGES = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];

  var STORAGE = { game: "wordle-game", stats: "wordle-stats", settings: "wordle-settings" };

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  var today = dayNumber(new Date());
  var settings = load(STORAGE.settings, {
    hardMode: false,
    dark: window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches,
    contrast: false,
  });
  var stats = load(STORAGE.stats, {
    played: 0, wins: 0, currentStreak: 0, maxStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0], lastWonDay: null,
  });

  // The game currently on screen: either today's daily puzzle or a practice word.
  var game;
  var currentGuess = "";
  var revealing = false;

  function newDailyGame() {
    return {
      day: today, answer: answerForDay(today, ANSWERS),
      guesses: [], evaluations: [], status: "playing", practice: false,
    };
  }

  function loadDailyGame() {
    var saved = load(STORAGE.game, null);
    return saved && saved.day === today ? saved : newDailyGame();
  }

  function persist() {
    if (!game.practice) save(STORAGE.game, game);
  }

  // ---------- DOM setup ----------

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $("board");
  var keyboardEl = $("keyboard");
  var rows = [];
  var keyEls = {};

  function buildBoard() {
    boardEl.innerHTML = "";
    rows = [];
    for (var r = 0; r < MAX_GUESSES; r++) {
      var row = document.createElement("div");
      row.className = "row";
      for (var c = 0; c < WORD_LENGTH; c++) {
        var tile = document.createElement("div");
        tile.className = "tile";
        row.appendChild(tile);
      }
      boardEl.appendChild(row);
      rows.push(row);
    }
  }

  function buildKeyboard() {
    var layout = ["qwertyuiop", " asdfghjkl ", "EzxcvbnmB"];
    keyboardEl.innerHTML = "";
    layout.forEach(function (line) {
      var rowEl = document.createElement("div");
      rowEl.className = "key-row";
      line.split("").forEach(function (ch) {
        if (ch === " ") {
          var spacer = document.createElement("div");
          spacer.className = "spacer";
          rowEl.appendChild(spacer);
          return;
        }
        var key = document.createElement("button");
        key.className = "key";
        if (ch === "E") {
          key.textContent = "Enter";
          key.dataset.key = "Enter";
          key.classList.add("wide");
        } else if (ch === "B") {
          key.textContent = "⌫";
          key.dataset.key = "Backspace";
          key.setAttribute("aria-label", "Backspace");
          key.classList.add("wide");
        } else {
          key.textContent = ch;
          key.dataset.key = ch;
          keyEls[ch] = key;
        }
        rowEl.appendChild(key);
      });
      keyboardEl.appendChild(rowEl);
    });
  }

  // ---------- Rendering ----------

  function renderBoard() {
    for (var r = 0; r < MAX_GUESSES; r++) {
      var word = r < game.guesses.length ? game.guesses[r] : r === game.guesses.length ? currentGuess : "";
      var evals = game.evaluations[r];
      var tiles = rows[r].children;
      for (var c = 0; c < WORD_LENGTH; c++) {
        var tile = tiles[c];
        var letter = word[c] || "";
        tile.textContent = letter;
        tile.className = "tile" + (letter ? " filled" : "") + (evals ? " " + evals[c] : "");
      }
    }
  }

  function renderKeyboard() {
    var states = keyboardStates(game.guesses, game.evaluations);
    Object.keys(keyEls).forEach(function (letter) {
      keyEls[letter].className = "key" + (states[letter] ? " " + states[letter] : "");
    });
  }

  function renderModeLabel() {
    $("mode-label").hidden = !game.practice;
  }

  function updateTile(index) {
    var tile = rows[game.guesses.length].children[index];
    var letter = currentGuess[index] || "";
    tile.textContent = letter;
    tile.className = "tile" + (letter ? " filled" : "");
  }

  function revealRow(rowIndex, evaluation, done) {
    var tiles = rows[rowIndex].children;
    revealing = true;
    for (var i = 0; i < WORD_LENGTH; i++) {
      (function (tile, state, delay) {
        setTimeout(function () {
          tile.classList.add("flip");
          setTimeout(function () { tile.classList.add(state); }, FLIP_DURATION / 2);
        }, delay);
      })(tiles[i], evaluation[i], i * FLIP_STAGGER);
    }
    setTimeout(function () {
      for (var j = 0; j < WORD_LENGTH; j++) tiles[j].classList.remove("flip");
      revealing = false;
      done();
    }, (WORD_LENGTH - 1) * FLIP_STAGGER + FLIP_DURATION);
  }

  function bounceRow(rowIndex) {
    var tiles = rows[rowIndex].children;
    for (var i = 0; i < WORD_LENGTH; i++) {
      (function (tile, delay) {
        setTimeout(function () { tile.classList.add("bounce"); }, delay);
      })(tiles[i], i * 100);
    }
  }

  function shakeRow() {
    var row = rows[game.guesses.length];
    row.classList.remove("shake");
    void row.offsetWidth; // restart the animation
    row.classList.add("shake");
  }

  function toast(message, duration) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    $("toasts").prepend(el);
    if (duration === Infinity) return;
    setTimeout(function () {
      el.classList.add("fade");
      setTimeout(function () { el.remove(); }, 300);
    }, duration || 1000);
  }

  // ---------- Input ----------

  function handleKey(key) {
    if (revealing || game.status !== "playing") return;
    if (key === "Enter") {
      submitGuess();
    } else if (key === "Backspace") {
      if (currentGuess.length > 0) {
        currentGuess = currentGuess.slice(0, -1);
        updateTile(currentGuess.length);
      }
    } else if (/^[a-z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
      currentGuess += key;
      updateTile(currentGuess.length - 1);
    }
  }

  function submitGuess() {
    if (currentGuess.length < WORD_LENGTH) {
      shakeRow();
      toast("Not enough letters");
      return;
    }
    if (!VALID.has(currentGuess)) {
      shakeRow();
      toast("Not in word list");
      return;
    }
    if (settings.hardMode) {
      var violation = hardModeViolation(currentGuess, game.guesses, game.evaluations);
      if (violation) {
        shakeRow();
        toast(violation);
        return;
      }
    }

    var guess = currentGuess;
    var evaluation = evaluateGuess(guess, game.answer);
    var rowIndex = game.guesses.length;
    game.hardMode = settings.hardMode;
    game.guesses.push(guess);
    game.evaluations.push(evaluation);
    currentGuess = "";

    var won = guess === game.answer;
    var lost = !won && game.guesses.length === MAX_GUESSES;
    if (won) game.status = "won";
    else if (lost) game.status = "lost";
    persist();

    revealRow(rowIndex, evaluation, function () {
      renderKeyboard();
      if (won) {
        toast(WIN_MESSAGES[rowIndex], 2000);
        bounceRow(rowIndex);
      } else if (lost) {
        toast(game.answer.toUpperCase(), Infinity);
      }
      if (won || lost) {
        if (!game.practice) recordResult(won, game.guesses.length);
        setTimeout(openStats, won ? 1800 : 1500);
      }
    });
  }

  // ---------- Stats ----------

  function recordResult(won, numGuesses) {
    stats.played++;
    if (won) {
      stats.wins++;
      stats.distribution[numGuesses - 1]++;
      stats.currentStreak = stats.lastWonDay === game.day - 1 ? stats.currentStreak + 1 : 1;
      stats.lastWonDay = game.day;
    } else {
      stats.currentStreak = 0;
    }
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    save(STORAGE.stats, stats);
  }

  function renderStats() {
    // A streak only survives if yesterday or today was won.
    var streak = stats.lastWonDay !== null && today - stats.lastWonDay <= 1 ? stats.currentStreak : 0;
    $("stat-played").textContent = stats.played;
    $("stat-win").textContent = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    $("stat-streak").textContent = streak;
    $("stat-max").textContent = stats.maxStreak;

    var max = Math.max.apply(null, stats.distribution.concat(1));
    var highlightRow = game.status === "won" && !game.practice ? game.guesses.length - 1 : -1;
    var dist = $("distribution");
    dist.innerHTML = "";
    stats.distribution.forEach(function (count, i) {
      var row = document.createElement("div");
      row.className = "dist-row";
      var label = document.createElement("span");
      label.textContent = i + 1;
      var bar = document.createElement("div");
      bar.className = "dist-bar" + (i === highlightRow ? " highlight" : "");
      bar.style.width = Math.max(7, (count / max) * 100) + "%";
      bar.textContent = count;
      row.appendChild(label);
      row.appendChild(bar);
      dist.appendChild(row);
    });

    var over = game.status !== "playing";
    $("game-over").hidden = !over;
    if (over) {
      $("answer-reveal").textContent = game.status === "won"
        ? (game.practice ? "Practice word solved!" : "You solved today's word!")
        : "The word was " + game.answer.toUpperCase();
      $("share-btn").hidden = game.practice;
    }
  }

  var countdownTimer = null;
  function updateCountdown() {
    var now = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var secs = Math.max(0, Math.floor((midnight - now) / 1000));
    var pad = function (n) { return String(n).padStart(2, "0"); };
    $("countdown").textContent = pad(Math.floor(secs / 3600)) + ":" + pad(Math.floor((secs % 3600) / 60)) + ":" + pad(secs % 60);
    if (secs === 0 && !game.practice) location.reload();
  }

  function openStats() {
    renderStats();
    updateCountdown();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(updateCountdown, 1000);
    $("stats-dialog").showModal();
  }

  function share() {
    var text = shareText(game.day, game.guesses, game.evaluations, game.status === "won", game.hardMode);
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator.share({ text: text }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        function () { toast("Copied results to clipboard"); },
        function () { toast("Couldn't copy results"); }
      );
    } else {
      toast("Sharing not supported");
    }
  }

  function startPractice() {
    var answer;
    do {
      answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    } while (answer === game.answer);
    game = { day: today, answer: answer, guesses: [], evaluations: [], status: "playing", practice: true };
    currentGuess = "";
    $("toasts").innerHTML = "";
    $("stats-dialog").close();
    renderAll();
  }

  // ---------- Settings ----------

  function applySettings() {
    document.body.classList.toggle("dark", !!settings.dark);
    document.body.classList.toggle("contrast", !!settings.contrast);
    $("hard-mode").checked = settings.hardMode;
    $("dark-theme").checked = settings.dark;
    $("high-contrast").checked = settings.contrast;
  }

  function bindSettings() {
    $("hard-mode").addEventListener("change", function (e) {
      if (game.guesses.length > 0 && game.status === "playing") {
        e.target.checked = settings.hardMode;
        toast("Hard mode can only be enabled at the start of a round");
        return;
      }
      settings.hardMode = e.target.checked;
      save(STORAGE.settings, settings);
    });
    $("dark-theme").addEventListener("change", function (e) {
      settings.dark = e.target.checked;
      save(STORAGE.settings, settings);
      applySettings();
    });
    $("high-contrast").addEventListener("change", function (e) {
      settings.contrast = e.target.checked;
      save(STORAGE.settings, settings);
      applySettings();
    });
  }

  // ---------- Wiring ----------

  function renderAll() {
    renderBoard();
    renderKeyboard();
    renderModeLabel();
  }

  function init() {
    game = loadDailyGame();
    buildBoard();
    buildKeyboard();
    applySettings();
    bindSettings();
    renderAll();

    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      var key = e.key === "Enter" || e.key === "Backspace" ? e.key : e.key.toLowerCase();
      handleKey(key);
    });

    keyboardEl.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-key]");
      if (!btn) return;
      btn.blur();
      handleKey(btn.dataset.key);
    });

    document.querySelectorAll("dialog").forEach(function (dialog) {
      dialog.querySelector(".close").addEventListener("click", function () { dialog.close(); });
      // Close when clicking the backdrop.
      dialog.addEventListener("click", function (e) {
        if (e.target !== dialog) return;
        var r = dialog.getBoundingClientRect();
        var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) dialog.close();
      });
    });
    $("stats-dialog").addEventListener("close", function () { clearInterval(countdownTimer); });

    $("help-btn").addEventListener("click", function () { $("help-dialog").showModal(); });
    $("stats-btn").addEventListener("click", openStats);
    $("settings-btn").addEventListener("click", function () { $("settings-dialog").showModal(); });
    $("share-btn").addEventListener("click", share);
    $("practice-btn").addEventListener("click", startPractice);

    if (game.status !== "playing") {
      setTimeout(openStats, 300);
    } else if (stats.played === 0 && game.guesses.length === 0) {
      $("help-dialog").showModal();
    }
  }

  init();
})();
