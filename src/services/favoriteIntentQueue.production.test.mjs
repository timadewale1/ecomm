import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "vite";

// Exercise the production transform, not just the uncompiled source. A nested
// optional method call in a parameter default previously built successfully but
// referenced an undeclared temporary when FavoritesProvider first mounted.
const root = fileURLToPath(new URL("../../", import.meta.url));
const built = await build({
  root,
  configFile: `${root}vite.config.js`,
  logLevel: "error",
  build: {
    write: false,
    rollupOptions: {
      input: fileURLToPath(new URL("./favoriteIntentQueue.mjs", import.meta.url)),
      preserveEntrySignatures: "strict",
      output: { format: "iife", name: "FavoriteQueueStartup" },
    },
  },
});
const code = built.output.find((item) => item.type === "chunk").code;

for (const environment of ["native-crypto", "no-random-uuid", "no-crypto", "crypto-unavailable"]) {
  test(`compiled favorites initializes and saves with ${environment}`, async () => {
    const crypto = environment === "native-crypto" ? {
      randomUUID() {
        assert.equal(this, crypto, "retain the native Crypto receiver");
        return "native-session-id";
      },
    } : environment === "no-random-uuid" ? {} : environment === "crypto-unavailable" ? {
      randomUUID() { throw new Error("unavailable"); },
    } : undefined;
    const context = vm.createContext({ crypto, setTimeout, clearTimeout });
    vm.runInContext(code, context);
    const requests = [];
    const queue = context.FavoriteQueueStartup.createFavoriteIntentQueue({
      readLiked: () => false,
      publish: () => {},
      onError: (error) => { throw error; },
      save: async (request) => {
        requests.push(request);
        return { liked: request.liked, wishCount: 7 };
      },
    });
    queue.setOwner("buyer");
    queue.toggle({ id: "product", wishCount: 6 });
    queue.flush();
    await new Promise((resolve) => setImmediate(resolve));
    queue.dispose();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].liked, true);
    assert.match(requests[0].clientSessionId, environment === "native-crypto" ? /^native-session-id:1$/ : /^favorite-.+:1$/);
  });
}
