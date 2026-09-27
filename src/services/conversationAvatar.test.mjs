import test from "node:test";
import assert from "node:assert/strict";
import { conversationAvatarSource, legacyChatCustomerId } from "./conversationAvatar.mjs";

const thread = { buyerId: "buyer", vendorId: "vendor", buyer: { avatarUrl: "old-copy" }, vendor: { avatarUrl: "store-photo" } };

test("legacy fallback is scoped to the signed-in vendor and never reads guest profiles", () => {
  assert.equal(legacyChatCustomerId(thread, "vendor", "vendor"), "buyer");
  for (const [audience, uid] of [["buyer", "buyer"], ["vendor", null], ["vendor", "other"]]) {
    assert.equal(legacyChatCustomerId(thread, audience, uid), null);
  }
  assert.equal(legacyChatCustomerId({ ...thread, participantType: "guest" }, "vendor", "vendor"), null);
  assert.equal(legacyChatCustomerId({ ...thread, buyerId: "bad/path" }, "vendor", "vendor"), null);
});

test("built-in data avatars and uploaded photos use the full working users.photoURL", () => {
  for (const photoURL of ["data:image/svg+xml," + "x".repeat(20_000), "https://example.com/upload.jpg"]) {
    assert.equal(conversationAvatarSource(thread, "vendor", { uid: "buyer", photoURL }), photoURL);
  }
});

test("removed avatars stay removed, and a different customer's cache is never used", () => {
  assert.equal(conversationAvatarSource(thread, "vendor", { uid: "buyer", photoURL: null }), "");
  assert.equal(conversationAvatarSource(thread, "vendor", { uid: "other", photoURL: "wrong" }), "old-copy");
  assert.equal(conversationAvatarSource(thread, "vendor", null), "old-copy");
});

test("repaired summaries take over without another read or resurrecting cached photos", () => {
  for (const avatarUrl of ["new-photo", ""]) {
    const repaired = { ...thread, buyer: { avatarUrl, avatarVersion: 2 } };
    assert.equal(legacyChatCustomerId(repaired, "vendor", "vendor"), null);
    assert.equal(conversationAvatarSource(repaired, "vendor", { uid: "buyer", photoURL: "stale" }), avatarUrl);
  }
});

test("buyer-side store images and guest contact icons are preserved", () => {
  assert.equal(conversationAvatarSource(thread, "buyer", { uid: "buyer", photoURL: "buyer-photo" }), "store-photo");
  assert.equal(conversationAvatarSource({ ...thread, participantType: "guest" }, "vendor", { uid: "buyer", photoURL: "wrong" }), "");
});
