# Token saver

Two halves of one DSH bundle:

- **Host half** (`index.js`) — the peak-hour guard. It listens to the
  `agent/pre-step` waterfall and returns `{ kind: 'reject' }` for every proposed
  model request made while the provider bills peak rates.
- **Browser half** (`client.js`) — the Settings page that switches the
  harness's token-saving machinery on and off, plus the savings strip under the
  composer that prices the session and steers the guard.

## What the guard does

A turn that is already running is not torn apart: it finishes the step it is in
(its tools complete) and only the *next* model request is refused, so the turn
ends as `blocked`. Two consequences worth knowing before a peak hour:

- The rejected step has already claimed its user message, and a blocked turn
  **discards** that message. The strip therefore warns *before* a send; if the
  text matters, grant an override first.
- The guard applies to every agent in this profile that goes through the
  `agent/pre-step` waterfall — this GUI session, subagents, workflow children,
  and any other client. It does not cover requests that bypass that waterfall,
  such as automatic condensation.

The rate schedule is modelled as two weekday windows in UTC minutes —
`[[60, 240], [360, 600]]`, that is 01:00–04:00 and 06:00–10:00 UTC, Monday to
Friday; every other instant is billed at half price. Chinese public holidays are
*not* modelled, so a holiday is refused until an override is granted.

## Steering it

| Control | Effect |
| --- | --- |
| `/peak-allow [minutes]` | Allow model requests for that many minutes (default 15, max 720) |
| `/peak-block` | Drop the override and refuse again |
| `/peak-guard [on\|off\|status]` | Disarm, arm, or describe the guard |
| Strip button `Allow 15m` | The same as `/peak-allow 15`, one click, only shown while refusing |
| Strip detail panel | `Allow 15m` / `Allow 60m`, `Block now`, `Guard on`/`off`, `Host status` |

The commands are commands, not tools, so an agent can never grant itself an
override. An override lives in Host memory and disappears on restart.

## Developing it

```sh
npm test        # schedule equivalence, guard decisions, and a strip render
```

The schedule is duplicated verbatim in both halves so the browser can price an
instant without a round trip; `test/pricing.test.mjs` asserts the two copies
agree minute by minute, and that the guard admits, refuses, and expires
correctly. `test/guard-ui.test.mjs` mounts the strip against a stand-in React and
walks its element tree.

**Host code is not hot-reloaded.** `dsh-hmr` watches only the profile's patch
files, and re-composition reuses the already imported plugin module, so edits to
`index.js` take effect only after restarting `dsh web`. Edits to `client.js`
appear on the next page load.
