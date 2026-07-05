# Fragments — From-Scratch Build Brief
A personal planning board people actually reopen, not a moodboard they open once.

This is a ground-up brief. It does not assume or reference any previous
codebase — build every piece described here fresh. Treat it as a spec you'd
hand to a new project on day one.

---

## 0. The one-line pitch

A no-login, link-based board where free-form collage (drag, crop, arrange
images and notes) sits on top of real planning data (price, links,
checkboxes, dates) — so a board is a living task you keep opening for
weeks, not a picture you make once and forget.

## 1. Who it's for, and the core use cases

Not "anyone who wants a moodboard." Specifically: someone in the middle of
planning something concrete, who wants it to look good while they do it.

- Planning a room or apartment
- Building a capsule wardrobe / outfit planning
- Planning a trip (places, packing, rough order)
- Planning an event (wedding, party, any celebration) — vendors, decor, budget
- Building a gift list for a specific person
- A completely free-form board, for anyone who just wants to arrange images

Every one of these is something a person keeps a browser tab open for
across multiple sessions — that's the design target, not "make it fun."

---

## 2. Feature set

### 2.1 Core loop (must exist for the product to make sense)
- **Purpose-first board creation.** Starting a board asks "what's this
  for?" and offers the six use cases above, each pre-seeded with a couple
  of starter items and short helper text — never a blank white rectangle
  as the first thing someone sees.
- **Free-form canvas.** Drag, resize, rotate images and text/shape items.
  Freeform crop shapes, blend modes, and basic color/brightness/contrast
  adjustment on images. A drawing tool for freehand annotation.
- **Item data layer.** Any item can optionally carry: a price, a source
  link, a checked/unchecked state, a 1–5 rating. This is what turns a
  picture into a task. Surface it as a small flip-to-reveal panel on the
  back of an item, not clutter on the front.
- **Auto-computed summaries.** The toolbar shows a running total ("$1,240
  so far") and checklist progress ("8 of 12 done") automatically whenever
  a board has items using those fields — a budget tracker and a checklist
  that never had to be set up as one.
- **Local persistence, no account.** IndexedDB for board data (images can
  be large — never localStorage for this). A unique URL is the only key
  needed to return. Multiple boards live in one browser, listed in a
  dashboard.

### 2.2 Retention mechanics (the actual point of this rebuild)
- **Dashboard nudges.** Computed entirely client-side from data already in
  IndexedDB: "Last opened 2 weeks ago — still 4 items left" on stale
  boards, "8 of 12 done" on active ones. No notifications infrastructure
  needed — the nudge lives where a returning user already looks.
- **Shuffle / auto-arrange.** One button that instantly re-lays-out
  scattered items into a tidy grid or a pleasant scattered collage
  (pick one algorithm, ship it well rather than offering ten weak options).
  Solves the real friction of "I don't want to manually tidy this right
  now" — genuinely useful, not just a gimmick.
- **A weekly creative prompt on the dashboard**, for the free-form/just-
  browsing case specifically (not the task-boards): a rotating short
  prompt ("this week: collect only textures, no full objects") that gives
  someone with no specific task a reason to open the app anyway. Can be a
  static rotating list keyed off the date — no backend required for this
  part.

### 2.3 Delight / novel (the things a design-literate visitor notices)
- **Time-lapse scrub.** A small scrubber that lets you drag through a
  board's edit history and watch it build up — periodic lightweight
  snapshots stored alongside the board (not full undo history, just
  checkpoints every N edits or every session). Genuinely uncommon in tools
  like this, and it turns "look what I made" into "look how it came
  together," which is a much better thing to show someone.
- **Focus / presentation mode.** One keystroke hides all chrome (toolbar,
  dock, dashboard nav) leaving just the canvas — for the moment you
  actually want to show the board to someone else, in person or over a
  call, without editing UI cluttering the screen.
- **Command palette (⌘K).** Quick actions — new board, jump to a board by
  name, toggle focus mode, export — searchable from one shortcut. Small
  detail, but it's the kind of thing that reads as "someone who's used a
  lot of well-made software built this," which matters for the audience
  you're building for.
- **Story-format export**, alongside the standard PNG export — a
  9:16 crop/composition option suited to sharing as an Instagram/social
  story, since "show someone your board" is a real use case this product
  should make easy.

### 2.4 Sharing (small and bounded, not a public feed)
- **Read-only share link**, separate from the private edit URL. Anyone
  with the link can view the board and leave a small sticky-note comment
  pinned to a specific item — no account needed to comment, matching the
  no-login model everywhere else.
- Deliberately **not** a public discovery feed or wall — no browsing
  other people's boards, no remixing. Sharing is one-to-one or one-to-a-
  few ("here's my registry, what do you think?"), which is both the
  actually-useful case and the one with the smallest moderation burden.
  Add a simple "report" action on shared views regardless — anonymous
  public-facing surfaces need at least that much, even at small scale.

---

## 3. Design system

### Why this can't be another soft-glassmorphism app
Blurred glass panels, rounded corners, one muted blue accent — this is
one of the most common "AI-built web app" patterns right now, and a
design-literate visitor recognizes it as a template look within seconds,
regardless of execution quality. The brief calls for something a design
student would actually compliment — which means a deliberate, specific
material language, not a safer version of the same look.

### Direction: risograph poster / printed zine
A risograph print uses a small number of flat spot-color inks, visible
paper grain, and slightly imperfect color registration. It's a real,
currently well-regarded aesthetic among designers, and it suits a
personal collage tool — this product is, underneath the planning-data
layer, a digital scrapbook — without reading as twee or gimmicky if kept
disciplined.

**Color** (named roles, not just hex — pick exact values when building,
these are the intended feel):
- `paper` — a warm, slightly dull off-white (not stark white, not the
  common cream-serif-terracotta AI-default palette)
- `ink` — a soft, warm near-black for text
- `riso-blue` — primary accent, used for primary actions only
- `riso-yellow` — secondary accent, used for highlights and "checked"/done states
- `riso-coral` — tertiary, used sparingly for delete/warning states
- `pencil` — a warm mid-grey for secondary text and hairline borders

**Type** — three roles, deliberately different jobs, not one font doing
everything:
- **Display** (board titles, section headers): a bold, confident,
  slightly condensed grotesque. Large, used sparingly, never for body
  copy.
- **Body** (UI chrome, descriptions, buttons): a plain, highly legible
  sans — this is the one place to default to something safe and
  readable; the personality lives in the display face and the shadow
  signature, not here.
- **Utility** (prices, tags, timestamps, item counts): a monospace —
  gives metadata a "printed label" feel instead of blending into body
  text.

**The one signature move — spend the design boldness here, and only
here:** replace soft blurred drop-shadows everywhere with a **hard, flat,
color-offset shadow** — a card sits on a solid few-pixel offset block of
`riso-blue` or `riso-yellow` instead of a blurred grey shadow, evoking
risograph color misregistration. Applied consistently across cards,
buttons, and board-dashboard covers, this single mechanical choice does
more to signal "someone designed this on purpose" than any other change,
and it's simple to implement and keep consistent.

**Texture**: one subtle, low-opacity grain/noise layer across the base
background — the difference between "flat digital UI" and something that
feels like it has material to it. Keep it subtle enough to never fight
with content legibility.

**Motion**: spring-based, physical-feeling motion (not linear/robotic),
but spend the animation budget deliberately in one or two places that
matter — a board snapping into place when opened, a checked item getting
a confident tick — rather than animating everything. Respect
prefers-reduced-motion.

**What to keep simple / not overdesign**: the item-editing controls
(price field, checkbox, rating), the boards dashboard list structure, and
all form inputs should stay plain and highly legible — the personality
belongs in the canvas/cover/shadow language, not in every single control.

### Non-negotiable quality floor
- Fully responsive down to mobile width.
- Visible keyboard focus states throughout, not just default browser
  outlines.
- `prefers-reduced-motion` respected — spring physics degrade to simple
  fades/no motion when set.
- Every screen (onboarding, canvas, dashboard, shared view) checked in
  both light and dark variants if dark mode is offered at all — don't ship
  a dark mode that's an afterthought on half the screens.

---

## 4. Information architecture

- `/` — onboarding: ask for a name (localStorage only, lightweight),
  nothing else. No account, no email.
- `/boards` — dashboard: grid of board covers (auto-styled using each
  board's dominant extracted colors), each showing its nudge line
  (progress or "last opened") and a "new board" entry point that opens the
  six-option purpose picker.
- `/board/[id]` — the canvas: toolbar, dock, canvas, command palette,
  focus mode toggle, share/export actions.
- `/share/[shareId]` — read-only view of a shared board, with the comment
  layer. No edit access, no link back to the private board.

---

## 5. Tech stack

- Next.js (App Router), React, TypeScript — same foundation as before,
  built fresh.
- Tailwind CSS + CSS variables for the design tokens above.
- Framer Motion for the spring-physics motion.
- `idb` for IndexedDB (board data, images, checkpoints for time-lapse).
- `nanoid` for board/share IDs.
- `html-to-image` for PNG and story-format export.
- Upstash Redis (already provisioned) for the share/comment feature only
  — nothing else needs a backend. Reference credentials only via
  `process.env.*`, never hardcoded.
- Vercel Edge Config (already provisioned) for the weekly rotating prompt
  list and the six board-kind starter templates — both are
  infrequently-changing config, which is exactly what Edge Config is for.
- Deployment: Vercel, no server-side database beyond the two pieces above.

---

## 6. Data model sketch

```ts
type BoardKind = 'home' | 'outfit' | 'trip' | 'event' | 'gift' | 'freeform';

interface CanvasItem {
  id: string;
  type: 'image' | 'text' | 'shape' | 'drawing';
  x: number; y: number; width: number; height: number; rotation: number;
  zIndex: number;
  src?: string;               // image data
  clipShape?: string;         // crop shape / custom path
  blendMode?: string;
  brightness?: number; contrast?: number; saturate?: number; blur?: number;
  text?: string;

  // planning data layer — the actual retention mechanic
  price?: number;
  sourceUrl?: string;
  checked?: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
}

interface BoardData {
  id: string;
  kind: BoardKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: CanvasItem[];
  checkpoints: { at: number; items: CanvasItem[] }[]; // for time-lapse
  shareId?: string;
}
```

---

## 7. Build order

1. Design tokens + the hard-offset-shadow signature, base layout shell,
   onboarding flow.
2. Canvas engine: drag/resize/rotate, image upload, text/shape items,
   crop/blend/filters, drawing tool, undo/redo (make sure undo/redo
   actually persists to IndexedDB — don't let visual state and saved
   state drift apart).
3. Purpose-first board creation with the six starter kinds.
4. Item data layer (price/link/checked/rating) + auto summaries in the
   toolbar.
5. Dashboard with nudges, board covers colored from extracted palettes.
6. Shuffle/auto-arrange, focus mode, command palette, story-format export.
7. Time-lapse checkpoints + scrubber.
8. Share link + comments via Upstash Redis, with the report action.
9. Weekly prompt + starter templates via Edge Config.

## 8. Definition of done
- [ ] New board never opens to a blank canvas — always the purpose picker.
- [ ] Any item can be given a price/link/checked/rating, and the toolbar
      summary updates live.
- [ ] Closing the tab mid-edit and reopening the board URL restores
      everything exactly, including anything done immediately before
      closing (no autosave race conditions).
- [ ] Dashboard shows an honest, correct nudge line per board.
- [ ] Shuffle produces a genuinely tidy/pleasant layout, not an
      overlapping mess.
- [ ] Focus mode and command palette both work end-to-end.
- [ ] A shared link is view-only, cannot be used to edit the source board,
      and supports comments without requiring an account.
- [ ] Every screen passes the quality floor in section 3 (responsive,
      focus states, reduced motion).
