const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const removed = [
  "ダイアログを開くと背景のスクロールが止まり、内容だけをスクロールできます。",
  "While a dialog is open, background scrolling stops and its content can scroll. ",
  "読み込んだセッションのセンサー数は、言語を切り替えても変わりません。",
  "The sensor count for a loaded session stays the same when you change language. "
];
for (const file of ["src/index.template.html", "wireless-sensor.html"]) {
  test(`${file}: user help omits implementation commentary`, () => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const text of removed) assert.ok(!html.includes(text), `Remove implementation copy from ${file}`);
  });
}
