# Browser regression record

The first real browser run failed before entering the scene with `Unexpected identifier 'uniform'`. The HTML builder had used a plain replacement string, allowing dollar sequences in bundled shader source to be interpreted by `String.replace`. The builder now inserts via a callback, verifies exact byte preservation, and parses the final extracted script.

The second run booted offline without network requests but failed fragment shader compilation: `patch` is a reserved GLSL word. The reflection mask variable is now `puddleMask`.

Additional inspected source corrections before re-running the whole suite:
- Real-time timestamps, rather than accumulated capped simulation deltas, determine camera transition duration.
- Individual seats retain 3D seat/back geometry but are instanced by sector and distance-culled. Distant views retain the original concrete/red stepped bowl.
- Balanced defaults reduce render pixel count, shadow-map resolution and reflection texture resolution without dropping core architecture.
- Walking-only controls use explicit CSS specificity and do not crowd the model overview.
- The stadium light switch persists across environment updates.

Historical failing JSON reports are kept separately from `acceptance.json`. Only the latest complete browser result establishes current status; neither this document nor a successful bundle alone establishes a passing experience.
