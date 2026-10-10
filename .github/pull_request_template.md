<!-- Thanks for the PR. Keep the two halves in sync: a change to the host half usually has a matching client change, because the schedule is duplicated verbatim in both so the browser can price an instant without a round trip. -->

## What this changes

<!-- One or two sentences. If it changes guard behaviour, say what an agent can and cannot do differently afterwards. -->

## Half touched

- [ ] Host (`index.js`)
- [ ] Browser (`client.js`)
- [ ] Both — schedule duplicated in each half, kept byte-identical
- [ ] Docs / templates only

## Checklist

- [ ] `npm test` passes (pricing schedule equivalence, guard decisions, strip render)
- [ ] If the schedule changed: the two copies agree minute by minute, and `pricing.test.mjs` covers the new boundary
- [ ] Overrides are still granted by command only — an agent must never be able to grant itself one
- [ ] `cordis.patch.yml` still declares every plugin id this bundle depends on
- [ ] README updated where behaviour changed

## Testing notes

<!-- How you verified it, and on which DSH version and model route. -->