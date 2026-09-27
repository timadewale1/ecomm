const test = require("node:test");
const assert = require("node:assert/strict");
const { patchKeyboardSource, replacements, SUPPORTED_VERSION } = require("./patch-ios-keyboard.cjs");

const original = replacements.map(([before]) => before).join("\n// unrelated code\n");

test("applies only the targeted changes and is idempotent", () => {
  const patched = patchKeyboardSource(original, SUPPORTED_VERSION);
  assert.equal(patchKeyboardSource(patched, SUPPORTED_VERSION), patched);
  let restored = patched;
  for (const [before, after] of replacements) restored = restored.replace(after, before);
  assert.equal(restored, original);
  assert.match(patched, /UIViewAnimationOptionBeginFromCurrentState/);
  assert.match(patched, /UIViewAnimationOptionAllowUserInteraction/);
  assert.match(patched, /animateWithDuration:duration delay:0/);
  assert.match(patched, /cancelPreviousPerformRequestsWithTarget:self/);
});

test("preserves CRLF files", () => {
  const patched = patchKeyboardSource(original.replace(/\n/g, "\r\n"), SUPPORTED_VERSION);
  assert.equal(patched.replace(/\r\n/g, "").includes("\n"), false);
  assert.equal(patchKeyboardSource(patched, SUPPORTED_VERSION), patched);
});

test("fails safely on dependency upgrades, changed anchors or partial patches", () => {
  assert.throws(() => patchKeyboardSource(original, "9.0.0"), /before upgrading/);
  assert.throws(() => patchKeyboardSource(original.replace("+0.2", "+0.3"), SUPPORTED_VERSION), /source changed/);
  assert.throws(() => patchKeyboardSource(original + replacements[1][0], SUPPORTED_VERSION), /source changed/);
  assert.throws(() => patchKeyboardSource(original.replace(...replacements[0]), SUPPORTED_VERSION), /incomplete/);
});
