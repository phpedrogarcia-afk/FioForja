# Gameplay integrity checkpoint — Operação Codex 05

BASE: antigravity/forge-lifecycle-proof-v1 @ 0663f4e52522643ab0d296f7f3e8cd083373df3e.
Scope: isolated codex/cross-agent-integration-v1 worktree. No original checkout changes, commit, push or main modification by this worker.

## Reproduced failures (before repair)

- gameplay-red.txt: 9 existing lifecycle tests pass; 4 new regressions fail on detached reward, foreign/incomplete finish, training cancellation scrap, and uncounted fracture strike.
- gameplay-strike-red.txt: original frozen checkout, only imports and in-memory storage: one physical callback pair produced strikesCount=2 and +12 gold; expected count=1; assertion failed. Original checkout was not modified.
- gameplay-negative-controls-red.txt: two further controls caught incomplete physicalProfile and attempt counter mismatch against a completed snapshot. Both guards were repaired.

## Implemented contract

- Start persists canonical attempt design, reserved metal, run identity, tools, training flag, optional existing compatible FusionCore and version 1 physical snapshot before opening Canvas.
- Every checkpoint carries the same run and a monotonic revision. Each physical strike has runId:strikeSequence identity. One transaction persists state, count and derived gold. Same/older applied revisions are economic NOOP; conflicting same revision, foreign run/design/core, missing attempt, sequence gaps/regressions and non-finite/invalid state fail closed. At most one new strike per checkpoint.
- Detached legacy strike callbacks cannot persist anything. The legacy pure reward helper also requires a current run/attempt, allowed finite amount and the next exact strike identity.
- Physical snapshots preserve heat, phase, deformation, structural condition, zones/history, quench, gear/core and accumulated simulation time. Effects, particle lists, animation frames and audio are excluded. Physics has no random draw; loot already derives its seed from run identity.
- Canvas commits immediately on strike/phase/tool/zone changes, periodically at 0.75 seconds of active simulation, and on pagehide. A failed write pauses physics and retains the exact pending checkpoint for explicit retry. Resuming a checkpoint captured during a held charge waits for a fresh hold to avoid an automatic release strike.
- UI promises the last confirmed point and possible rollback of up to 1 second of active heating/charge, not frame-exact recovery. A legacy attempt without a compatible physical snapshot is preserved for explicit fair cancellation; no physical state is invented.
- Finish requires ACTIVE attempt, done confirmed in the persisted snapshot, identical run/design/training/core and physical state, and matching strike count. It generates the economic sword only from the confirmed snapshot, with a deterministic sword ID derived from run. It validates finite result attributes, consumes the still-existing bound core once, and clears the attempt atomically. A finished simulation detached from the attempt cannot mint an economic sword.
- Claim binds to the persisted economic sword and its exact frozen pendingRewards. Training, foreign/altered payload, non-finite amounts and duplicate claims fail closed. Legacy swords without pendingRewards are not given new arbitrary payouts from UI-generated payloads.
- Training remains free. Training start forces canonical iron, ignores core options, and never consumes a core. Training cancellation pays zero scrap. Successful unbroken Q>=50 training gives +1 scrap only with gold<50, no iron/steel (including canonical aliases) and scrap<2. Rare locked materials do not block recovery. Shared basic iron price is BASIC_IRON_RECOVERY_COST in materials.ts. Career, monetary rewards, drops, fusion and commission isolation remain intact.

## Tests and boundaries

- gameplay-focused.txt: focused gameplay suite, including real furnace/charge/release/reheat/zone/quench input sequences, with 90 tests in 13 suites; no skips.
- Existing tests that previously finished arbitrary heat-phase simulations were corrected to exercise the actual lifecycle; negative cases retain the former bypass attempts.
- Unit/in-memory integration tests are not browser proof. Root owns browser playback, integrated build and complete suite after all workers freeze.
- This is local game integrity against accidental/alternate internal flows and replay. It is not server authority or protection against a user rewriting their own localStorage.
- Checkpoints serialize the existing complete save synchronously. No separate database/event-sourcing service was introduced; large-collection I/O remains a performance limitation to measure if it becomes material.

## Kev consultation

One consultation was made after collecting shared evidence, before implementation. The low-margin ranking preferred complete event sourcing (0.3233; bounded snapshot 0.1559). This ranking was overridden because the actual simulator is small (~900 bytes initially before the wrapper), deterministic apart from an external clock, and already structured for direct physical-state capture. Bounded physical checkpoints with a persisted clock satisfy the receiver requirement with less change surface. Probabilities were advice, not proof or authority. No further consultation was made.
