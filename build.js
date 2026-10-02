// Bundles index.html, style.css and the scripts into one self-contained file
// that opens with a double-click (no server, no other files needed).
//   node build.js                -> wordle.html
//   node build.js --fragment out -> page body only, for embedding elsewhere
const fs = require("fs");
const path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
let html = read("index.html");

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/, (_, f) => `<style>\n${read(f)}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${read(f)}</script>`);

const args = process.argv.slice(2);
if (args[0] === "--fragment") {
  const title = html.match(/<title>.*<\/title>/)[0];
  const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  fs.writeFileSync(args[1], `${title}\n${style}\n${body}`);
  console.log("Wrote " + args[1]);
} else {
  fs.writeFileSync(path.join(__dirname, "wordle.html"), html);
  console.log("Wrote wordle.html");
}
