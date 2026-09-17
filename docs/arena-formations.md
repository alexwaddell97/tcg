# Arena formation track

Units and relics share four fixed positions per player in each arena. Positions use zero-based `slotIndex` in engine state and display as 1–4. Wide layouts show `1 2 3 4`. Narrow layouts fold the chain into `1 2 / 4 3`. Both players see the same logical order; the opponent's formation is not mirrored.

The brass track connects 1–2, 2–3 and 3–4. The ends never connect. Hover or keyboard focus highlights the selected position and its connected neighbours. During a drag, the proposed destination and its neighbours are highlighted instead. Small position numbers remain visible on cards and empty spaces. Tracks are drawn only between card edges, preserving the art and cosmetic borders.

Drag a unit to an empty position to queue it. A queued unit can move to another empty position or return to the hand. Dropping on the arena tile uses the first available position. Keyboard users pick up with Up, follow the chain with Left/Right, choose an arena with Up/Down, drop with Enter and cancel with Escape. Tapping a card still opens its full-screen description.

The shared engine validates occupied and duplicate positions before accepting a turn. Units reserve exact positions, including while waiting to reveal. Incoming tokens, transfers and movement use the first free, unreserved position. Removing a unit leaves a gap; surviving cards never compact. Position choices remain private until both players commit. Spells have no position and remain playable on full formations.

Positionless plans from existing bots are assigned deterministic free positions. Older snapshots render in their existing array order, and the engine gives those cards fixed positions before the next reveal. Reveal snapshots carry positions through movement animations and the final score ceremony.

Chainbridge now rewards occupied neighbours, Leyline Nexus takes power from the preceding position, and Gilded Exchange trades the cards in fixed position 4 after turn 4. These all use the same logical track on every device. See [arena rules and resolution](arena-concepts-v1.md) for the full nine-arena pool. The board preview includes formation and twist lineups and effect demonstrations.

Verification covers explicit and automatic placement, private plans, malformed and conflicting submissions, queued relocation, gaps after movement and clearing, reserved positions during enemy transfers and token creation, playback destinations, and positions transmitted through a complete multiplayer match.
