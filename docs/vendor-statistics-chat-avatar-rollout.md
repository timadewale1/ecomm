# Dashboard statistics and chat profile images

## Scope and behaviour

- One paid delivery/pickup order counts once; a stockpile counts once across all
  its paid additions. Unpaid drafts do not count. Missing legacy payment status
  remains compatible. Refunded paid orders stay in history rather than vanishing.
- Fulfilled means delivered/collected. Declined/cancelled orders are closed, not
  fulfilled or outstanding. A refund after actual delivery does not erase that
  fulfilment. A courier cancellation alone does not cancel the customer's order.
- Closed/expired piles with accepted items remain outstanding until delivered.
  Rejecting an addition does not close an otherwise valid pile. Rejecting all
  additions closes that one pile. Individual declined entries on the orders page
  remain unchanged. Missing legacy pile IDs are not guessed or merged together.
- Counts derive from the existing vendor-owned Redux snapshot, without new
  order reads or mutations. The total card exposes the closed count separately.
  Payout calculations and revenue provider calls are preserved.

Chat originally truncated avatar data/URLs to 1,800 characters. The current
built-in DiceBear choices are roughly 16–19KB. Both offer and question writers
now preserve complete valid sources; customers use canonical `users.photoURL`.
Explicit removal remains removal. Vendors retain their existing image priority.
Broken images display the normal contact icon; a changed source retries normally.

The vendor Messages page now has one continuous inbox. Its legacy Open/Closed
question tabs and the unused inquiries listener were removed from this page.
Historical inquiry documents and their direct routes are retained, not migrated
or deleted. The existing guest one-answer/email flow is unchanged.

For older conversation summaries, the vendor's inbox rows and chat header reuse
the same `users.photoURL` lookup and Redux profile cache that worked in the old
question tabs. Reads are scoped to the conversation's vendor and non-guest buyer,
deduplicated between rows/header, cached for five minutes, and backed off for a
minute after failure. This uses the existing read permissions, without widening
rules. Version-2 summaries remain authoritative (including avatar removal), so
repaired conversations do not need extra user-profile reads. User account
switching cannot render a previous vendor's cached inbox, and auth restoration
finishes before the page decides to redirect to sign-in.

Existing conversation summaries repair in authenticated batches of at most ten.
The backend verifies membership before reading profiles and transactionally
updates **only** `buyer/vendor.avatarUrl` and additive `avatarVersion: 2` fields.
Messages, unread counts, activity timestamps, blocking and guest-answer state do
not change. Profile details such as email/phone are not returned or projected.
The version marker prevents repeat repair; the client deduplicates requests and
backs off failures. Existing profile-change triggers propagate future edits.

## Deploy backend first

No functions, rules, documents or indexes are deleted. No rules/index changes are
required. Deploy every affected writer so an old function cannot reintroduce a
truncated avatar after repair. From the Firebase project root:

```bash
cd /Users/tobi/Documents/Codex/2026-08-03/thrifters
firebase deploy --only functions:refreshOfferConversationAvatarsV1,functions:offersOnCreate,functions:syncOfferConversationFromOfferV1,functions:ensureOfferConversationV1,functions:hydrateMyOfferConversationsV1,functions:syncOfferConversationBuyerProfileV1,functions:syncOfferConversationVendorStateV1,functions:createProductQuestionV2,functions:confirmGuestProductQuestionV1
```

These functions have other pre-existing local edits. Review those pending changes
before deployment: Firebase deploys the full local version, not just this patch.
This task does not deploy cloud changes or publish the website.

Then build/copy the frontend to the target native platform and run it from Xcode
or Android Studio. Visiting the chat list/opening an old conversation repairs its
avatar summary without a manual database-wide backfill. Offline chats retain
cached data and retry on a later snapshot/visit after the cooldown.

## Verification

```bash
cd /Users/tobi/Documents/Codex/2026-08-03/thrifters/ecomm
node --test src/services/vendorOrderStatistics.test.mjs src/services/chatAvatarRepair.test.mjs
node --test src/services/conversationAvatar.test.mjs scripts/chat-inbox.test.cjs
node --test ../functions/participantAvatars.test.js ../functions/offerConversations.test.js
```

Device checks: one active pile with several repiles; one declined repile; fully
declined first order; delivered pile; normal delivered and collected pickup;
customer using a built-in avatar; uploaded photo; changed/removed photo; old
question-only thread; guest thread. Repaired avatars should show in the list and
chat header, without extra message toasts or unread-count changes.
