---
name: Support Ticket Analyzer
description: A station departure board for support triage; every ticket gets a line and its category flips into place.
colors:
  board: "#0b2f6b"
  board-deep: "#061d44"
  board-edge: "#02122e"
  cell-upper: "#0a2756"
  flap: "#f4f6fa"
  flap-dim: "#c9d4e8"
  flap-hair: "rgba(244, 246, 250, 0.2)"
  signal: "#ffcc00"
  signal-lift: "#ffd633"
  shell: "#e9edf3"
  paper: "#ffffff"
  ink: "#14171c"
  ink-mute: "#4a5465"
  rule: "#c3cbd8"
  alert: "#a3141c"
  alert-wash: "#fbe9ea"
typography:
  masthead:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
  flap:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1
  title:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  row:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.12em"
  label-sm:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  cell: "14px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.signal-lift}"
  button-primary-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.ink-mute}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.flap-dim}"
    typography: "{typography.body-sm}"
    padding: "4px 0"
  button-text-hover:
    textColor: "{colors.flap}"
  input-ticket:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
  filter-tab:
    backgroundColor: "transparent"
    textColor: "{colors.flap}"
    typography: "{typography.label}"
    padding: "10px 14px"
  filter-tab-active:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
  flap-cell:
    backgroundColor: "{colors.board-deep}"
    textColor: "{colors.flap}"
    typography: "{typography.flap}"
    rounded: "{rounded.none}"
    width: "26px"
    height: "36px"
  flap-cell-keywords:
    backgroundColor: "transparent"
    textColor: "{colors.flap}"
  new-tag:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
    padding: "2px 6px 1px"
  outcome-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "16px"
  outcome-panel-error:
    backgroundColor: "{colors.alert-wash}"
    textColor: "{colors.alert}"
---

# Design System: Support Ticket Analyzer

## Overview

**Creative North Star: "The Departure Board"**

The screen is a Swiss/Dutch station hall. A pale, cool shell holds the working pane where a ticket is pasted; beside it hangs an enamel station-blue board that carries the session's queue as a dense departure table in flap-white type. Each classified ticket is a line on that board, and its category arrives as a three-letter code set in split-flap cells (ACC, BIL, TEC, OTH) that flip once into place. Signal yellow is the hall's only accent: it marks the one thing to press, where focus is, which filter is live, and which row is newest.

Density and steadiness are the philosophy. Rows are fixed-height, columns are fixed-width, figures are tabular, and one fixed type ramp carries all hierarchy, so the hundredth ticket of a shift lands exactly where the first did. Structure is drawn with hairlines and square edges, never with cards, shadows, or rounded pills. The classifier that answered is printed on every row; the keyword fallback is its own honest state, drawn outlined and dashed instead of filled.

**Key Characteristics:**
- Two grounds: cool shell for composing, station-blue board for the queue.
- One accent (signal yellow), used only for action, focus, active filter, and newest marker.
- Split-flap cells as the signature: solid for AI answers, outlined for keyword guesses.
- Hairline rules and square corners throughout; zero elevation.
- One fixed five-step type ramp with tabular figures everywhere.

## Colors

A cold station palette: enamel blue and flap-white on one side, cool paper greys and near-black ink on the other, with a single sodium-yellow signal.

### Primary
- **Signal Yellow** (signal): the single accent. Primary button fill, active filter tab, the NEW row tag, text selection, and the focus outline. Its hover lift is **Signal Lift** (signal-lift), used only on the primary button.

### Secondary
- **Enamel Station Blue** (board): the board panel ground, sticky table header ground, and the fill of split-flap cells when they print on the light shell.
- **Board Deep** (board-deep) and **Cell Upper** (cell-upper): the lower and upper halves of a split-flap cell on the board; the hard 50% split between them is the flap.
- **Board Edge** (board-edge): flap-cell borders and the dark mid-cell seam.

### Tertiary
- **Alert Red** (alert) on **Alert Wash** (alert-wash): the outcome panel's error state only (border, text, background). Not used on the board.

### Neutral
- **Flap White** (flap): all primary type on the board, cell glyphs, the header rule under column labels, outlined keyword cells.
- **Flap Dim** (flap-dim): secondary type on the board (column labels, "Newest first", category words, the text button).
- **Flap Hairline** (flap-hair): row dividers and filter-strip rules on the board.
- **Cool Shell** (shell): page ground and compose pane.
- **Paper** (paper): the textarea and the outcome panel; the only light surface raised from the shell, by color not shadow.
- **Ink** (ink): body type on the shell, the top bar ground, the textarea and primary-button borders.
- **Ink Mute** (ink-mute): placeholder, character count, notes, disabled button text.
- **Rule** (rule): hairlines on the shell (pane divider, outcome border, legend rule, disabled button border).

### Named Rules
**The One Signal Rule.** Yellow appears only on the primary action, the focus ring, the active filter, the NEW tag, and selection. Nothing decorative is yellow.

**The Honest Fallback Rule.** A keyword-matched classification is never drawn like an AI one: its flap cells are outlined with a transparent fill, and its VIA code sits in a dashed box. Solid cells mean an AI answered.

**The Lift-Not-Grey Rule.** No neutral grey surface fills. On the board, emphasis is a flap-white tint over the blue (8% for hover, 9% for the newest row); on the shell, the only raised surface is Paper.

## Typography

**Display / Label Font:** Barlow Semi Condensed (with Arial Narrow, Arial)
**Body Font:** Barlow (with Helvetica Neue, Arial)

**Character:** A transit-signage pairing. The semi-condensed cut does the station work (flap glyphs, tracked uppercase labels, the masthead); the regular width carries readable ticket text and big tabular numerals.

### Hierarchy
- **Masthead** (600, 1rem, line-height 1, 0.06em, uppercase): the product name in the top bar only.
- **Flap** (600, 1.375rem, line-height 1): glyphs inside split-flap cells; steps down to 0.9375rem in small cells.
- **Title** (600, 1.375rem, line-height 1, tabular): filter counts and the outcome category name. The clock uses the same face at 1rem.
- **Row** (400, 1rem, 1.45): table cells on the board. Time cells take weight 500 and 0.02em tracking.
- **Body** (400, 0.9375rem, 1.45): root text and textarea (1.5 there).
- **Body Small** (400, 0.8125rem): meta, notes, status, "via" lines, legend text.
- **Label** (600, 0.8125rem, 0.12em, uppercase, semi-condensed): field labels, section headings, filter tabs (0.08em there), VIA codes (0.14em).
- **Label Small** (600, 0.75rem, 0.14em, uppercase, semi-condensed): column headers, legend and outcome headings, the NEW tag.

### Named Rules
**The Fixed Ramp Rule.** Five sizes only: 0.75, 0.8125, 0.9375, 1, 1.375rem. Hierarchy comes from weight, case, tracking, and ground, never from a new size.

**The Tabular Rule.** Tabular figures are set at the root; every time, count, and character tally aligns in columns.

## Layout

Full-viewport app shell (100svh): a slim top bar (min 48px, ink ground) over a two-column workspace. The compose pane on the left is clamp(340px, 30vw, 420px) wide on the shell, padded 28px 24px 24px, stacking label, textarea (min 240px), meta, primary button, outcome panel, and a legend pinned to the bottom. The board fills the rest and scrolls its own table; the column header is sticky.

The board is inset 32px. A permanent five-slot filter strip (All plus the four categories, equal fixed slots) doubles as the count summary. The table uses fixed layout with fixed column widths (time 84px, category 210px, via 132px, chars 84px; ticket takes the rest) and 62px rows, so nothing shifts as results arrive. The outcome panel holds a 132px minimum so every state fits the same box.

Spacing runs on 4 / 8 / 12 / 16 / 24 / 32px, with 14px as the cell inset shared by table cells, filter tabs, and the textarea.

Responsive: below 1360px the category word beside the flaps is visually hidden and the category column narrows to 128px. Below 960px the workspace stacks (compose above board) and the page scrolls instead of the panes; board insets drop to 16px. Below 640px the table header is visually hidden and each row becomes a two-line grid entry (time, flaps, via on top; ticket excerpt below) still separated by hairlines, filter tabs stack code over count, and the character column is dropped.

## Elevation & Depth

Flat. There are no elevation shadows anywhere. Depth is conveyed by ground (shell vs. board vs. paper), by hairlines, and inside the flap cells by the hard two-tone split and seam. The one box-shadow in the system is a 3px signal ring paired with a 2px ink outline as the compose pane's focus treatment; it is a focus indicator, not elevation.

### Named Rules
**The Hairline Rule.** Structure is 1px lines: Rule on the shell, Flap Hairline on the board, a full Flap White line under the column header. Borders thicken to 2px only on the primary button.

## Shapes

Square everywhere (0px radius): buttons, textarea, panels, flap cells, tags, filter tabs. The recurring silhouette is the split-flap cell: a small upright rectangle (26 by 36px; 20 by 26 small, 30 by 42 large) with a horizontal seam across its middle, set in runs with 3px gaps. Dashed lines are reserved for provisional or fallback states (the idle outcome panel, the keyword VIA box). The keyboard hint is a 1px current-color box around key glyphs.

## Components

### Buttons
Blunt and singular; one primary action per surface.
- **Shape:** square (0px), 2px Ink border, 48px tall.
- **Primary (Classify):** Signal Yellow fill, Ink text in Title weight at 1rem, label left and the keyboard hint right (space-between), 0 16px padding.
- **Hover / Active / Focus:** fill lifts to Signal Lift over 120ms on the system ease; active nudges down 1px; focus shows the ink outline plus signal ring.
- **Disabled:** transparent fill, Rule border, Ink Mute text, not-allowed cursor.
- **Secondary (Re-classify with answers, Try again):** Paper fill, 1px Ink border, 40px minimum height, Ink text at weight 600; hover fills Shell. Never yellow: yellow stays with Classify.
- **Text button (Clear board):** no box, Flap Dim underlined text (3px offset) at Body Small, brightening to Flap White on hover. On the shell (Copy questions) it prints in Enamel Station Blue, darkening to Ink on hover.

### Inputs / Fields
- **Style:** Paper fill, 1px Ink border, square, 12px 14px padding, Body type, board-blue caret, vertical resize only.
- **Focus:** 2px Ink outline at 3px offset plus a 3px Signal ring.
- **Meta:** a right-aligned character count in Ink Mute below.

### Filter Strip (navigation)
- **Style:** five equal slots between two Flap Hairlines, divided by hairlines; each slot holds the code in Label (with the full name at weight 500, 80% opacity) and its count in Title.
- **States:** hover adds an 8% flap-white tint; the pressed tab fills Signal Yellow with Ink text; focus is an inset outline (Flap White, or Ink on the active tab).
- **Keyboard:** Alt/Option 1 to 5 select slots in order.

### Outcome Panel
- **Corner Style / Border:** square, 1px Rule border, Paper fill, 16px padding, 132px minimum height.
- **Idle:** dashed border, Ink Mute text.
- **Error:** Alert border and text on Alert Wash; hidden when there is no error.

### Selected Ticket Panel (follow-up questions)
- **Container:** same square Paper box with a 1px Rule border, 16px padding, 12px gaps. Shows the ticket selected on the board (the newest by default).
- **Result:** "Selected ticket" label with the time at right, then the large flap run beside the category name (Title) and the "via" line; a keyword result adds a check-before-routing note; the ticket text in Ink Mute, clamped to 3 lines.
- **Ask the customer:** below a Rule hairline. Numbered questions at weight 500, each followed by a 2-row Paper answer field with a 1px Ink Mute border. While loading: "Drafting questions…" with two Shell bars that pulse (static under reduced motion). Preset questions add a one-line note that the AI didn't answer; an empty list says nothing is missing.
- **Re-check:** the secondary button re-classifies with the answers (⌘/Ctrl+Enter inside the panel); the flaps flip again and one line says whether the category changed.

### Split-Flap Cells (signature)
- **Board (AI):** Cell Upper over Board Deep with a hard 50% split, 1px Board Edge border, Flap White glyph, and a 1px dark seam across the middle.
- **On the shell (AI):** the cell prints in solid Enamel Station Blue with the dark Board Edge seam.
- **Keyword fallback:** transparent fill, Flap White border on the board (Ink border and glyph on the shell); here the seam takes the surrounding ground color so the cell reads cut through.
- **Pending:** glyphs hidden; a faint flap-white block pulses in three steps over 900ms.
- **Fresh:** on the newest result only, each cell rotates in from -88deg on X with a brightness flash over 420ms, staggered 70ms per cell. Reduced motion: instant.

### Departure Rows
- **Style:** 62px fixed rows, Row type, hairline dividers, no zebra striping.
- **Newest:** 9% flap-white tint across the row and a Signal Yellow NEW tag after the excerpt.
- **VIA:** CLAUDE / MISTRAL in tracked Label; KEYWORDS in a 1px dashed Flap White box; pending reads "Classifying…" in Flap Dim, sentence case.
- **Selected:** 18% flap-white tint and a weight-600 time; the excerpt is a button that selects the row (J/K move the selection).
- **ASK:** follow-up status in Flap Dim at Body Small: answers so far ("1/3"), "None", "Re-checked", or "Retry".
- **Empty:** a single 124px row with a bold Flap White line and a Flap Dim instruction.

### Status Indicator
An 8px square before the backend label in the top bar: hollow while checking, solid Flap White when online, 45-degree hatched when unreachable (paired with brighter text), so state never relies on color alone.

## Do's and Don'ts

### Do:
- **Do** put every category on the board as a three-letter code in split-flap cells, solid for AI and outlined for keywords.
- **Do** print the classifier on every row and every result.
- **Do** keep rows, columns, the outcome panel, and the filter strip fixed-size so results never shift layout.
- **Do** draw structure with 1px hairlines and keep every corner square (0px).
- **Do** stay inside the five-step ramp (0.75 to 1.375rem) with tabular figures.
- **Do** give every flip and pulse a reduced-motion fallback of no animation.

### Don't:
- **Don't** use Signal Yellow for anything but the primary action, focus, active filter, NEW tag, and selection.
- **Don't** render the queue as cards, pills, or rounded chips; it is a table on the board.
- **Don't** add elevation shadows; depth comes from ground and hairlines.
- **Don't** introduce neutral grey fills; on the board use flap-white tints of 9% or less.
- **Don't** draw a keyword result with a solid cell or a plain VIA code.
- **Don't** add type sizes outside the fixed ramp.
