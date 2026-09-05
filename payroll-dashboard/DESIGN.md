# PeoplePay360 — Design System (v1, built)

**Source:** rebuilt from the live React app at `src/`. Ground truth over intention.

---

## Palette

| Token | Value | Role |
|-------|-------|------|
| `--color-paper` | `#FFF9F6` | Page ground |
| `--color-ink-900` | `#0F151D` | Primary text, active pills |
| `--color-ink-800` | `#1A2230` | Hover ink, dark sections |
| `--color-cream` | `#F7F5EE` | Card surfaces, hover rails, filter backgrounds |
| `--color-cream-2` | `#EFEADD` | Deeper cream, subtle dividers |
| `--color-accent-500` | `#FF7448` | Primary actions, selected bars |
| `--color-accent-600` | `#F15824` | Primary hover |
| `--color-accent-100` | `#FFE9DF` | Accent tints, success trend chips |
| `--color-success` | `#198A35` | Approved, present, paid |
| `--color-warning` | `#B45309` | Pending, late, balance low |
| `--color-error` | `#C92A20` | Refused, absent, missing |
| `--color-info` | `#1450C6` | Overtime, computed, validated |

Grays scale from paper → ink (`--color-gray-50` = paper, `--color-gray-900` = ink).

---

## Typography

- **Font:** Inter (Google Fonts, wght 400/500/600/700) — user requirement, nomu.store alignment
- **Headings:** tracking `-0.02em`, weight 600 (not 700)
- **Body:** 0.875rem / 1.5 line-height, 400 weight
- **KPI values:** 1.9rem / 600 / tabular-nums
- **Tabular data:** `font-variant-numeric: tabular-nums` on all money/count cells

---

## Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 10px | — |
| `--radius-md` | 14px | inputs (overridden to pill), dropdowns |
| `--radius-lg` | 18px | cards (overridden to 24px), modals |
| `--radius-xl` | 24px | panels, table containers, KPI tiles |
| pills | `9999px` | buttons, badges, nav items, avatar, topbar, search |

**Rule:** pills for all controls and nav; 24px for content containers.

---

## Surfaces

- **Page ground:** `--color-paper` (body)
- **Cards/panels:** `#FFFFFF` + `box-shadow: var(--shadow-soft)` + `border: 1px solid rgba(20,19,16,.04)`
- **Hover lift:** `var(--shadow-lift)` + `transform: translateY(-2px)` on KPI tiles
- **Selected row (tables):** `--color-paper` bg (no border accent)
- **Active nav pill:** `--color-ink-900` bg + white text + soft shadow

---

## Controls

### Buttons (`.btn` base + variant)
| Variant | Background | Text | Shadow |
|---------|------------|------|--------|
| `.btn-primary` | `--color-accent-500` | white | coral offset + spread |
| `.btn-secondary` | white | ink | inset 1px `--color-gray-200` |
| `.btn-dark` | `--color-ink-900` | white | — |
| `.btn-ghost` | transparent | `--color-gray-600` | — |
| `.btn-success` | `--color-success` | white | — |
| `.btn-danger` | `--color-error` | white | — |
| `.btn-link` | none | `--color-accent-600` | — |

All: pill radius (`9999px`), no border, active scale 0.985.

### Inputs (`.input`)
- Pill radius (`9999px`), 1px `--color-gray-200` border, white bg
- Focus: `--color-accent-500` ring (3px, `--color-accent-100`)
- Error: `--color-error` border + `--color-error-bg` bg

### Selects
- Same as inputs, custom dropdown arrow (ink stroke), pill radius

### Badges (`.badge`)
- Pill radius, 0.75rem text, 500 weight
- Semantic variants via tinted backgrounds (success/warning/error/info/primary/gray)

---

## Navigation

### Topbar (floating pill)
- `fixed top-3`, `mx-2`, `h-14`, `rounded-full`
- White/90 + `backdrop-filter: blur(12px)` + soft shadow + 1px `rgba(0,0,0,.04)` border
- Logo: ink pill `w-8 h-8` + "peoplepay<span className="text-accent-500">360</span>"
- Nav: text-only pills (`px-4 py-2 rounded-full`), active = ink pill with white text + shadow
- Search: pill button `bg-cream`, expands to full-width input overlay
- Notifications/avatar: 40px pill icons

### Sidebar (desktop)
- `fixed top-24 bottom-6 left-4`, `w-60`
- Items: `px-4 py-2.5 rounded-full`, active = ink pill white text + shadow
- Settings at bottom: same pill grammar, ink icon

---

## Data Display

### Tables
- Header: `--color-cream` bg, `--color-gray-500` text, 0.8125rem, 500 weight
- Rows: `.9rem 1.1rem` padding, `--color-gray-100` bottom border
- Hover: `--color-paper` bg
- Selected: `--color-paper` bg (no accent border)
- Numbers: tabular-nums, right-align for currency

### Charts
- **Bar:** pill bars (`rounded-full`), proportional height, first bar ink, rest coral
- **Line:** 2px coral stroke, round caps/joins, 2.5px white-stroked dots
- **Mini bars:** 10px track height, semantic color fills

### KPI Tiles (`.kpi`)
- White card, 24px radius, soft shadow, 1px `rgba(20,19,16,.04)` border
- Label: 0.8125rem / 500 / `--color-gray-500`
- Value: 1.9rem / 600 / ink / tabular-nums
- Trend: semantic badge (success/error/gray)
- Hover: lift shadow + -2px translate

---

## Alerts / Toasts / Modals

### Alerts (`.toast`, AlertItem)
- White card, 14px radius, 3px inset accent color left edge (toast)
- AlertItem: tinted semantic bg (60% opacity), rounded-lg, no border
- Icons: 20x20 inline SVG

### Modals
- Overlay: `rgba(15,21,29,.4)` + `backdrop-filter: blur(2px)`
- Panel: 24px radius, lift shadow, max 90vh scroll
- Close: 40px pill icon button

---

## Motion (one authored moment)

- Entrance: `animate-fade-in` (0.2s) / `animate-scale-in` (0.24s cubic-bezier .16,1,.3,1) / `animate-slide-in` (0.28s)
- KPI tiles: staggered `animate-scale-in` via index delay
- No per-element hover transforms beyond documented lifts
- Dropdowns/toast/modal: `animate-scale-in` from center

---

## Responsive

- Desktop breakpoint: ≥1024px (sidebar visible, topbar full)
- Tablet: sidebar off-canvas, topbar logo-only
- Mobile (<768px): topbar hamburger → full-screen drawer, filter bar stacks, tables horizontal scroll, KPI grid 1-col, charts full-width

---

## Browser Surfaces (themed)

- `::selection`: `--color-accent-500` / white
- Focus ring: 2px `--color-accent-500` / 2px offset
- Scrollbar: 10px, transparent track, `--color-gray-300` thumb + 2px paper border, `--color-gray-400` hover
- Number inputs: tabular-nums

---

## Resolved Detector Findings

| Finding | Verdict | Reason |
|---------|---------|--------|
| Inter font (overused-font warning) | **Accepted override** | User requirement + nomu.store uses Inter; brief pins the world |

---

## File Map (key)

| File | Purpose |
|------|---------|
| `src/index.css` | Tokens (`@theme`), base, component layer (plain CSS) |
| `src/components/UI.jsx` | Button, Input, Select, Badge, Card, Table, Modal, KPICard, AlertItem, Dropdown, Toast, etc. |
| `src/components/Topbar.jsx` | Floating pill topbar, search overlay, notifications, user menu |
| `src/App.jsx` | Shell: floating sidebar, page container, routes |
| `src/pages/Dashboard.jsx` | KPI row, salary/dept bars, monthly trend line, alerts, attendance/time-off mini sections |
| `src/pages/EmployeesList.jsx` | Employee table/kanban, filters, bulk actions, form/view |
| `src/pages/PayrunsList.jsx` | Payrun table, wizard (scope → employees), detail with actions |
| `src/pages/*` | Contracts, Attendance, TimeOff, Reports — same grammar |

---

## Build Contract (direction)

**THESIS:** A payroll desk printed on paper — cream ground, ink text, one coral pencil. Refuses the navy fintech dashboard default.

**OWN-WORLD:** `#FFF9F6` paper, `#0F151D` ink, `#FF7448` coral acts, pill surfaces, Inter medium-weight, borderless soft-shadowed sheets.

**STORY:** HR operator scans alerts and net-pay figures, sees status at a glance in pill badges, acts through coral pills.

**FIRST VIEWPORT:** floating cream topbar, cream sidebar with ink-pill active item, KPI ledger row, coral Create actions top-right.

**FORM:** reskin of the incumbent React app; nomu.store (pinned brief) as the visual world; seed key: brief-pinned, no roll.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.