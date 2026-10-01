import test from "node:test";
import assert from "node:assert/strict";
import {createChatParticipantClient} from "./chatParticipantClient.mjs";

test("chat requests send scope, not customer identity, and whitelist the response", async () => {
  const session = {uid: "vendor"};
  const client = createChatParticipantClient({currentUser: () => session, call: async data => {
    assert.deepEqual(data, {conversationId: "chat"});
    return {data: {profile: {uid: "buyer", displayName: "Buyer", photoURL: "avatar", email: "PRIVATE"}}};
  }});
  assert.deepEqual(await client({conversationId: "chat", customerId: "buyer"}), {uid: "buyer", displayName: "Buyer", photoURL: "avatar"});
});
test("logout and same-UID reauthentication discard late profile responses", async () => {
  for (const replacement of [null, {uid: "other"}, {uid: "vendor"}]) {
    let session = {uid: "vendor"};
    const client = createChatParticipantClient({currentUser: () => session, call: async () => {
      session = replacement;
      return {data: {profile: {uid: "buyer"}}};
    }});
    await assert.rejects(client({inquiryId: "question"}), /account changed/);
  }
});
test("anonymous/mismatched responses cannot populate an avatar cache", async () => {
  await assert.rejects(createChatParticipantClient({currentUser: () => null})({conversationId: "chat"}), /Sign in/);
  const session = {uid: "vendor"};
  const client = createChatParticipantClient({currentUser: () => session, call: async () => ({data: {profile: {uid: "other"}}})});
  await assert.rejects(client({conversationId: "chat", customerId: "buyer"}), /confirmed/);
});
