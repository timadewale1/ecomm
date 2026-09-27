# My Thrift change-safety rules

- Before redesigning an existing screen, audit its current UI behaviours, data reads/writes, Firebase Storage usage, Firestore fields, Cloud Functions, routes, and downstream consumers.
- Treat functionality absent from a Figma frame as unspecified, not authorization to remove it.
- Preserve existing behaviour by default. If a previous setup may be removed, disconnected, replaced, or made inaccessible, report exactly what it does, where its data lives, what depends on it, and why removal is proposed. Obtain explicit approval before removing it.
- When behaviour or design intent is unclear, stop and ask rather than infer.
- Verify Figma spacing, typography, controls, labels, and every state against the actual design before describing an implementation as exact.
- Prefer additive and backward-compatible Firebase changes. Never delete or migrate live fields, documents, collections, Storage objects, rules, indexes, functions, or secrets without an explicit impact review and approval.
- Keep reports complete enough to expose regressions and uncertainty; do not omit relevant legacy behaviour merely to make the handoff shorter.
