---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: []
---

# Analyzer + session queue

Scope: the app's main screen (`frontend/src/App.tsx`): classify one ticket and keep this session's classified tickets in a browser-side queue. Mode: Operate. No backend changes.

Audience and task: support agents on desktop, high volume, office light, all shift. Paste, classify, scan, move on, keyboard first. Avoid: mouse-only paths, decoration over density, AI hype, layout shift while loading.

Unresolved: persistence beyond the session, assignment, helpdesk integration.

## Direction contract

THESIS: Every ticket gets a line on the board and its category flips into place. Refuses the default helpdesk card-and-pill screen: the queue is a departure board, a dense table, not a list of cards.

OWN-WORLD: Pale cool shell ground; enamel station-blue board panel holding the queue in flap-white tabular type; signal yellow as the single accent (primary action, focus, active filter, newest row marker). Category codes ACC / BIL / TEC / OTH set in split-flap cells. Hairlines only, no grey fills, tabular figures, one fixed type ramp.

STORY: The agent pastes a ticket, presses ⌘↵, sees the category flip into the top row with its classifier named, and trusts it or not depending on whether it reads CLAUDE / MISTRAL or the outlined KEYWORDS state. Filters narrow the board by category.

FIRST VIEWPORT: Slim top bar with product name and backend status. Left ~420px compose pane on the shell: Ticket label, textarea, yellow Classify button with ⌘↵ hint, and the last result's summary. Right: the blue board fills the rest: permanent category count strip (All · ACC · BIL · TEC · OTH, fixed slots) doubling as filter tabs, then header TIME · TICKET · CATEGORY · VIA · CHARS, then rows. Empty board shows a quiet "No departures yet" row state.

FORM: Departure board (Swiss/Dutch split-flap station boards), my grounded list #3, assigned by the roll. Raises: tabular density with hairlines (Datamatics), fixed ramp carries hierarchy (Star Atlas), keyword fallback as its own honest outlined state (Bitmap Specimen), finite category roster with fixed slots (Character Goods). Signature interaction: the category flaps flip once into place on the newest row (reduced motion: instant). seed:bd3e7293ceddf4c9

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
