# PeoplePay360 — Exhaustive Frontend Plan
> **For AI Agent Use · Stack-agnostic · UI/UX-Pro-Max · Playwright-Ready**  
> Every screen, every state, every interaction, every edge case. Nothing assumed. Nothing skipped.

---

## Agent Skills Active

```yaml
skills:
  - impeccable        # Zero tolerance for incomplete states, broken flows, or missing feedback
  - ui-ux-pro-max     # Every interaction is considered, every empty state is designed, every transition is intentional
  - playwright        # Every interactive element must have data-testid attributes; all flows must be automatable
```

### Skill Contracts

**`impeccable`** — Before marking any screen complete, verify:
- Every field has a label, placeholder, validation message, and error state
- Every async action has a loading state and an error fallback
- Every list has an empty state
- Every form has a success confirmation
- No dead-end navigation (always a way back or forward)

**`ui-ux-pro-max`** — Every screen must implement:
- Keyboard navigation (Tab order, Enter to submit, Escape to close)
- ARIA labels on all interactive elements
- Tooltips on icon-only buttons
- Responsive breakpoints: desktop (1280px+), tablet (768–1279px), mobile (< 768px)
- Skeleton loaders (not spinners) for data fetch states
- Toast notifications for all mutations (success, error, warning)
- Confirmation dialogs for all destructive actions
- Focus trapping in modals and drawers

**`playwright`** — Every interactive element must have:
```html
data-testid="[module]-[component]-[action]"
<!-- Examples: -->
data-testid="employee-form-submit"
data-testid="payrun-wizard-step1-continue"
data-testid="attendance-list-row-0"
data-testid="timeoff-approve-btn"
```

---

## Design System

### Color Tokens
```css
/* Primary — Deep Navy (trust, corporate, payroll) */
--color-primary-900: #0f1f3d;
--color-primary-700: #1a3561;
--color-primary-500: #2952a3;
--color-primary-300: #6b93d6;
--color-primary-100: #dce8f8;
--color-primary-50:  #f0f6ff;

/* Accent — Teal (action, progress, active states) */
--color-accent-600: #0d7a6e;
--color-accent-400: #14a896;
--color-accent-200: #7dd3cb;
--color-accent-50:  #e6f7f6;

/* Semantic */
--color-success:     #16a34a;
--color-success-bg:  #f0fdf4;
--color-warning:     #d97706;
--color-warning-bg:  #fffbeb;
--color-error:       #dc2626;
--color-error-bg:    #fef2f2;
--color-info:        #2563eb;
--color-info-bg:     #eff6ff;

/* Neutral */
--color-gray-950: #0a0a0a;
--color-gray-800: #1f2937;
--color-gray-600: #4b5563;
--color-gray-400: #9ca3af;
--color-gray-200: #e5e7eb;
--color-gray-100: #f3f4f6;
--color-gray-50:  #f9fafb;
--color-white:    #ffffff;

/* Status badges */
--status-active:    #16a34a;  /* green */
--status-inactive:  #6b7280;  /* gray */
--status-pending:   #d97706;  /* amber */
--status-draft:     #9ca3af;  /* light gray */
--status-validated: #2563eb;  /* blue */
--status-paid:      #16a34a;  /* green */
--status-refused:   #dc2626;  /* red */
--status-approved:  #16a34a;  /* green */
```

### Typography
```css
/* Scale */
--text-xs:   0.75rem  / 1rem;       /* 12px — meta, badges */
--text-sm:   0.875rem / 1.25rem;    /* 14px — labels, table cells */
--text-base: 1rem     / 1.5rem;     /* 16px — body */
--text-lg:   1.125rem / 1.75rem;    /* 18px — section headings */
--text-xl:   1.25rem  / 1.75rem;    /* 20px — page subtitles */
--text-2xl:  1.5rem   / 2rem;       /* 24px — page titles */
--text-3xl:  1.875rem / 2.25rem;    /* 30px — KPI numbers */
--text-4xl:  2.25rem  / 2.5rem;     /* 36px — dashboard hero */

/* Weights */
--font-normal:   400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;
```

### Spacing Scale
```
4px · 8px · 12px · 16px · 20px · 24px · 32px · 40px · 48px · 64px · 80px · 96px
```

### Border Radius
```css
--radius-sm:   4px;   /* tags, badges */
--radius-md:   8px;   /* inputs, cards */
--radius-lg:   12px;  /* modals, panels */
--radius-xl:   16px;  /* large cards */
--radius-full: 9999px; /* pills, avatars */
```

### Elevation / Shadows
```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06);
--shadow-lg:  0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05);
--shadow-xl:  0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04);
```

### Component Primitives

#### Button Variants
```
Primary    — bg: primary-500,  text: white,   hover: primary-700
Secondary  — bg: white,        text: primary-500, border: primary-300, hover: primary-50
Danger     — bg: error,        text: white,   hover: #b91c1c
Ghost      — bg: transparent,  text: gray-600, hover: gray-100
Link       — bg: transparent,  text: primary-500, underline on hover
Icon-only  — 36×36px, radius-md, ghost style, always has tooltip + aria-label
```

#### Input States
```
Default  — border: gray-200,   bg: white
Focus    — border: primary-500, ring: primary-100 2px
Error    — border: error,       bg: error-bg, error message below
Disabled — bg: gray-50,        text: gray-400, cursor: not-allowed
Readonly — bg: gray-100,       border: gray-200
```

#### Badge / Status Pill
```
<span class="badge badge--[status]">Label</span>
— Sizes: sm (text-xs, px-2 py-0.5) | md (text-sm, px-2.5 py-1)
— Always includes a colored dot (8px) to the left of the text
— Never use color alone to convey status (always include text label)
```

#### Table Standards
```
- Header: bg gray-50, text gray-600, font-medium text-sm, uppercase: NO
- Row: bg white, hover bg primary-50, border-bottom gray-100
- Selected row: bg primary-50, left border 3px primary-500
- Zebra striping: optional, use only when rows > 20
- Sticky header: always on tables taller than viewport
- Column widths: defined explicitly, not auto
- Minimum row height: 52px (comfortable touch target)
- Action column: always rightmost, fixed width 120px
- Pagination: always present if records can exceed 20
```

---

## Global Layout

### Shell Structure
```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR  (56px, fixed)                                  │
│  [Logo] [Nav: Employees|Contracts|Attendance|Time Off   │
│          |Payroll|Reports] [Search] [Notif] [Avatar]    │
├────────────────────────────────────────────────────────-┤
│  BREADCRUMB BAR (40px, sticky below topbar)             │
│  Home > Module > Sub-page                               │
├────────────────────────────────────────────────────────-┤
│                                                         │
│  PAGE CONTENT AREA  (scrollable)                        │
│  max-width: 1440px, padding: 0 32px                     │
│                                                         │
│  PAGE HEADER (title, subtitle, primary CTA)             │
│  ─────────────────────────────────────                  │
│  FILTERS / SEARCH BAR                                   │
│  ─────────────────────────────────────                  │
│  MAIN CONTENT (list / form / dashboard)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Topbar
- **Height:** 56px, fixed, z-index 1000
- **Background:** primary-900
- **Logo:** Left-aligned, 140px wide, links to Dashboard
- **Nav items:** text-sm font-medium text-primary-100, active state: text-white + bottom border 2px accent-400
- **Active module:** highlighted with accent underline
- **Right cluster:** GlobalSearch (icon → expands to input), Notification bell (with unread count badge), User avatar (dropdown: Profile, Settings, Logout)
- **Mobile:** Hamburger menu → full-screen slide-in drawer with same nav items stacked vertically
- `data-testid="topbar-nav-[module]"` on each nav link

### Breadcrumb Bar
- **Height:** 40px, sticky top 56px, bg white, border-bottom gray-100
- **Format:** `Module › Sub-page › Record name`
- Last segment: current page (not a link), gray-800 font-medium
- Parent segments: links, gray-500, hover underline
- `data-testid="breadcrumb-[level]"` per segment

### Page Header Pattern
```
┌──────────────────────────────────────────────┐
│ Page Title (text-2xl font-bold gray-900)     │
│ Subtitle/description (text-sm gray-500)      │
│                         [Secondary] [Primary]│
└──────────────────────────────────────────────┘
```
- Title and actions always on same row (flex, space-between)
- On mobile: stack title above, actions below (full-width buttons)

### Notification System
- Toast stack: bottom-right, max 4 visible, auto-dismiss 4s (errors: 7s, sticky)
- Types: success (green), error (red), warning (amber), info (blue)
- Each toast: icon + title + optional description + close button
- `data-testid="toast-[type]"`

### Global Search
- Triggered by topbar icon or keyboard shortcut Cmd/Ctrl+K
- Opens a centered modal overlay (Command Palette style)
- Searches across: Employees, Contracts, Payruns, Payslips
- Results grouped by entity type with icons
- Keyboard: Arrow keys to navigate, Enter to open, Escape to close
- `data-testid="global-search-input"`, `data-testid="global-search-result-[index]"`

---

## MODULE 1 — Employees

### 1.1 Employee List Page

**Route:** `/employees`

#### Page Header
```
Employees                               [Import] [+ New Employee]
Showing 47 employees                    [Kanban | List] toggle
```

#### View Toggle
- **List View** (default for HR operations)
- **Kanban View** (default for visual overview)
- Toggle persists in localStorage per user

#### Filter Bar
```
[Search by name, ID, email...] [Department ▾] [Status ▾] [Job Position ▾] [Manager ▾] [Clear Filters]
```
- All filters combinable, chips appear below filter bar showing active filters with × to remove each
- Search debounced 300ms
- `data-testid="employee-filter-search"`, `data-testid="employee-filter-department"`, etc.

#### List View Columns
| Column | Width | Sortable | Notes |
|---|---|---|---|
| Avatar + Full Name | 220px | Yes | Avatar: initials fallback, 32px circle |
| Employee ID | 100px | Yes | Monospace text |
| Department | 140px | Yes | - |
| Job Position | 160px | Yes | - |
| Manager | 160px | No | Name only |
| Working Schedule | 140px | No | Schedule name |
| Status | 100px | Yes | Badge: Active / Inactive / On Leave |
| Actions | 120px | No | View · Edit · (⋮ More) |

- Row click → opens Employee Form (not actions column)
- Actions column: `View` (link icon), `Edit` (pencil), `⋮` dropdown: Deactivate, Delete (with confirmation)
- Bulk select: checkbox column appears on hover of first row; bulk actions bar appears at bottom when any selected (Deactivate, Export, Delete)
- `data-testid="employee-list-row-[id]"`, `data-testid="employee-list-checkbox-[id]"`

#### Kanban View
- Columns by Department (dynamic, based on existing departments)
- Each card: Avatar, Name, Job Position, Status badge, Schedule tag
- Card click → Employee Form
- Drag-and-drop between columns updates Department (with confirmation toast)
- Add New button in each column header → pre-fills department in form
- `data-testid="employee-kanban-card-[id]"`, `data-testid="employee-kanban-column-[dept]"`

#### Empty State
```
[Illustration: empty desk with plant]
No employees yet
Add your first employee to get started.
[+ Add Employee]
```

#### Pagination
- 20 records per page default (configurable: 10 / 20 / 50 / 100)
- Shows: "Showing 1–20 of 47"
- `data-testid="pagination-prev"`, `data-testid="pagination-next"`, `data-testid="pagination-page-[n]"`

---

### 1.2 Employee Form (Create & Edit)

**Route:** `/employees/new` · `/employees/[id]/edit`

#### Layout
- Two-column layout on desktop: main fields (left, 65%) + sidebar (right, 35%)
- Single column on mobile
- Sticky action bar at bottom of page: `[Discard] [Save Draft] [Save]`

#### Section: Personal Information
```
┌─────────────────────────────────────────────────────────┐
│  [Avatar Upload — 96px circle, click to change]         │
│  Full Name *           Employee ID (auto-generated)     │
│  Date of Birth         Gender (dropdown)                │
│  Personal Email        Phone Number                     │
│  Address (textarea)                                     │
└─────────────────────────────────────────────────────────┘
```
- Employee ID: auto-generated, read-only, format EMP-XXXXXX
- Avatar upload: drag-and-drop or click, accepts jpg/png, max 2MB, previews immediately, crop tool on upload
- `data-testid="employee-form-name"`, `data-testid="employee-form-avatar-upload"`

#### Section: Work Information
```
Department *             Job Position *
Manager                  Working Schedule *
Employment Status *      Employment Type (Full-time / Part-time / Contract)
Start Date *             End Date (only if not permanent)
Work Email               Work Phone
```
- Department: searchable select, options loaded from API
- Manager: searchable select from existing active employees (cannot select self)
- Working Schedule: searchable select from configured schedules
- Employment Status: Active / Inactive / On Leave (dropdown)
- `data-testid="employee-form-department"`, `data-testid="employee-form-manager"`, etc.

#### Section: Bank & Payment Details
```
Bank Name                Account Number
IFSC / Routing Code      Account Holder Name
Payment Method (Bank Transfer / Cash / Cheque)
```
- Account number: masked display after save (show last 4 digits only)
- `data-testid="employee-form-bank-account"`

#### Sidebar: Quick Stats (Edit mode only)
```
┌──────────────────────────┐
│  Active Since: Jan 2023  │
│                          │
│  [Contracts]      3 →    │
│  [Attendance]   142 →    │
│  [Time Off]       8 →    │
│  [Allocations]    4 →    │
└──────────────────────────┘
```
- Each row is a smart button: shows record count, click opens filtered list for that employee
- Count displayed in a teal badge
- `data-testid="employee-smartbtn-contracts"`, `data-testid="employee-smartbtn-attendance"`, etc.

#### Sidebar: Recent Activity (Edit mode only)
- Last 5 activity log entries for this employee
- Format: `[Icon] Action description · timestamp`

#### Form Validation Rules
| Field | Rule |
|---|---|
| Full Name | Required, min 2 chars, max 100 chars |
| Department | Required |
| Job Position | Required |
| Working Schedule | Required |
| Employment Status | Required |
| Start Date | Required, cannot be future date |
| Work Email | Valid email format, unique across employees |
| Account Number | If provided, must be numeric, 8–18 digits |

#### Error Display
- Inline below each field: red text, error icon
- On submit with errors: scroll to first error, shake animation on field
- Global error banner at top if API fails: "Could not save. Please try again."

#### Success State
- On save: toast "Employee saved successfully" + redirect to Employee View page
- On create: toast "Employee created" + redirect to new Employee View page

---

### 1.3 Employee View Page

**Route:** `/employees/[id]`

- Read-only display of all employee data
- Same two-column layout as form
- `[Edit]` button in page header (primary)
- `[Deactivate]` button (danger, with confirmation dialog)
- Tabs at bottom: `Contracts | Attendance | Time Off | Allocations | Activity Log`
- Each tab shows a mini-list of related records with a "View All →" link
- `data-testid="employee-view-tab-[name]"`, `data-testid="employee-view-edit-btn"`

---

## MODULE 2 — Contracts

### 2.1 Contract List Page

**Route:** `/contracts`

#### Filter Bar
```
[Search by employee name or contract ID] [Employee ▾] [Status ▾] [Date Range ▾] [Clear]
```

#### List View Columns
| Column | Width | Notes |
|---|---|---|
| Employee | 200px | Avatar + name, links to employee |
| Contract ID | 100px | Monospace |
| Start Date | 110px | Formatted date |
| End Date | 110px | "Ongoing" if no end date |
| Wage | 120px | Currency formatted |
| Salary Structure | 160px | Structure name |
| Status | 110px | **Active** (green), Expired (gray), Pending (amber) |
| Actions | 100px | View · Edit |

- Active contract row: bold text, left border 3px green
- Expired rows: muted text (gray-400)
- Row click → Contract form

#### Active Contract Indicator
- Visually prominent: each employee section (when grouped) highlights the active contract
- Cannot have two Active contracts for same employee at same time — this is enforced on save with error: "This employee already has an active contract. Please expire the existing contract before creating a new one."

---

### 2.2 Contract Form

**Route:** `/contracts/new` · `/contracts/[id]/edit`

#### Fields
```
Employee *               Contract ID (auto)
Contract Type            (Open-ended / Fixed-term)
Start Date *             End Date (required if Fixed-term)
Department               Job Position
Wage Amount *            Wage Frequency (Monthly / Weekly / Hourly)
Salary Structure *       Working Schedule
Status *                 (Active / Inactive / Pending)
Notes (textarea)
```

- Employee: searchable select, required
- When Employee selected: warn if they already have an Active contract (inline warning, not block)
- Salary Structure: searchable select, required (drives payslip computation)
- Wage Amount: numeric, currency symbol prefix, 2 decimal places
- `data-testid="contract-form-employee"`, `data-testid="contract-form-wage"`, `data-testid="contract-form-submit"`

#### Validation
| Field | Rule |
|---|---|
| Employee | Required |
| Start Date | Required |
| End Date | Required if Fixed-term; must be after Start Date |
| Wage Amount | Required, > 0 |
| Salary Structure | Required |
| Status = Active | Block if employee already has an Active contract (API-level check) |

#### Success
- Toast: "Contract saved" + redirect to contract view
- If this contract is now the Active contract: badge in employee's smart button updates live

---

## MODULE 3 — Working Schedules

### 3.1 Schedule List Page

**Route:** `/schedules`

#### List Columns
| Column | Width | Notes |
|---|---|---|
| Name | 200px | - |
| Type | 120px | Fixed / Flexible / Shift |
| Weekly Hours | 100px | Auto-computed, formatted "40h 00m" |
| Assigned Employees | 120px | Count badge, click → filtered employee list |
| Status | 100px | Active / Inactive |
| Actions | 100px | View · Edit |

---

### 3.2 Schedule Form

**Route:** `/schedules/new` · `/schedules/[id]/edit`

#### Fields
```
Schedule Name *          Type (Fixed / Flexible / Shift)
Status                   Timezone
```

#### Weekly Pattern Table (the core component)
```
┌─────────────────────────────────────────────────────────────┐
│  Day        Start Time    End Time     Break (min)  Hours   │
│  ──────────────────────────────────────────────────────────  │
│  Monday     [09:00]       [18:00]      [60]         8h 00m  │
│  Tuesday    [09:00]       [18:00]      [60]         8h 00m  │
│  Wednesday  [09:00]       [18:00]      [60]         8h 00m  │
│  Thursday   [09:00]       [18:00]      [60]         8h 00m  │
│  Friday     [09:00]       [18:00]      [60]         8h 00m  │
│  Saturday   [—]           [—]          [—]          OFF     │
│  Sunday     [—]           [—]          [—]          OFF     │
│  ──────────────────────────────────────────────────────────  │
│  Total Weekly Hours:                              40h 00m   │
└─────────────────────────────────────────────────────────────┘
```
- Each row: toggle (working / off day) via checkbox at left
- When toggled off: Start, End, Break inputs disable and show "—"
- Hours per day = (End − Start) − Break, auto-calculated on blur of any time field
- Total Weekly Hours = sum of all day hours, live-updates
- Time inputs: 24h format, time picker on click
- Break: numeric input, minutes, default 60
- `data-testid="schedule-day-[day]-start"`, `data-testid="schedule-day-[day]-end"`, `data-testid="schedule-total-hours"`

#### Validation
- At least 1 working day required
- End time must be after start time on each row
- Break cannot exceed (End − Start)

---

## MODULE 4 — Time Off

### 4.1 Time Off Type List

**Route:** `/time-off/types`

#### List Columns
| Column | Notes |
|---|---|
| Name | e.g. Annual Leave, Sick Leave |
| Unit | Days / Hours |
| Requires Allocation | Yes / No badge |
| Approval | None / Manager / HR |
| Payroll Impact | Paid / Unpaid |
| Active | Toggle switch inline |
| Actions | Edit |

---

### 4.2 Time Off Type Form

**Route:** `/time-off/types/new` · `/time-off/types/[id]/edit`

#### Fields
```
Name *                   Code (short, e.g. AL, SL)
Unit *                   (Days / Hours)
Requires Allocation *    (Yes / No — toggle)
Approval Workflow *      (No Approval / Manager / HR Manager / Both)
Payroll Integration      (Paid / Unpaid)
Maximum per Year         (numeric, optional cap)
Carry Over               (Yes / No)
Carry Over Limit         (numeric, shown only if Carry Over = Yes)
Color                    (color picker — used in calendar views)
Description              (textarea)
Active                   (toggle)
```
- `data-testid="timeoff-type-form-name"`, `data-testid="timeoff-type-form-unit"`, etc.

---

### 4.3 Allocation List

**Route:** `/time-off/allocations`

#### Filter Bar
```
[Search employee] [Leave Type ▾] [Status ▾] [Year ▾] [Clear]
```

#### List Columns
| Column | Notes |
|---|---|
| Employee | Avatar + name |
| Leave Type | Tag with color dot |
| Allocated | Numeric (days or hours) |
| Taken | Numeric |
| Remaining | Numeric, color-coded (green > 5, amber 1–5, red 0) |
| Valid From | Date |
| Valid Until | Date |
| Status | Draft / Approved / Expired |
| Actions | Approve · Refuse · Edit |

- Approve / Refuse: inline action buttons, no modal needed
- On Approve: row status badge changes to green, remaining balance becomes available
- `data-testid="allocation-row-[id]-approve"`, `data-testid="allocation-row-[id]-refuse"`

---

### 4.4 Allocation Form

**Route:** `/time-off/allocations/new`

```
Employee *               Leave Type *
Number of Days/Hours *   Validity From *
Validity Until *         Notes (textarea)
```
- Unit label (Days / Hours) dynamically changes based on selected Leave Type
- `data-testid="allocation-form-employee"`, `data-testid="allocation-form-amount"`, `data-testid="allocation-form-submit"`

---

### 4.5 Time Off Request List

**Route:** `/time-off/requests`

#### Filter Bar
```
[Search employee] [Leave Type ▾] [Status ▾] [Date Range ▾] [My Team ▾] [Clear]
```

#### List Columns
| Column | Width | Notes |
|---|---|---|
| Employee | 180px | Avatar + name |
| Leave Type | 140px | Color dot + name |
| From Date | 110px | - |
| To Date | 110px | - |
| Duration | 90px | "3 days" or "6 hours" |
| Status | 110px | Draft / Pending / Approved / Refused |
| Requested On | 110px | - |
| Actions | 150px | Approve · Refuse · View |

- Pending requests: row has amber left border
- Approved: green left border
- Refused: red left border + strikethrough on dates
- Bulk approve: checkbox + bulk action bar
- `data-testid="timeoff-request-row-[id]"`, `data-testid="timeoff-request-approve-[id]"`, `data-testid="timeoff-request-refuse-[id]"`

---

### 4.6 Time Off Request Form

**Route:** `/time-off/requests/new`

```
Employee *               Leave Type *
From Date *              To Date *
Duration                 (auto-calculated, read-only)
Half Day                 (toggle — if enabled, show AM/PM selector for From and To)
Reason                   (textarea, optional unless type requires it)
Attachments              (file upload, optional)
```

#### Inline Balance Preview (shown after selecting employee + leave type)
```
┌──────────────────────────────┐
│ Annual Leave Balance         │
│ Available:    15 days        │
│ This Request:  3 days        │
│ Remaining:    12 days        │
│ ─────────────────────────── │
│ ⚠ 3 other approved requests │
│   overlap this period        │
└──────────────────────────────┘
```
- Warn if request exceeds available balance (block submit if leave type requires allocation)
- Warn if dates overlap an existing approved request for same employee
- `data-testid="timeoff-request-balance-preview"`, `data-testid="timeoff-request-form-submit"`

#### Approval Flow (on Request View page, for HR Manager+)
```
[Request detail view]
    Status: Pending Approval
    
    [Refuse ▾] [Approve ✓]
    
    Add a note (optional textarea, shown when either button clicked)
    [Confirm Refuse] or [Confirm Approve]
```
- On Approve: status → Approved, balance auto-deducted, employee notified (toast simulated)
- On Refuse: status → Refused, reason saved, employee notified
- `data-testid="timeoff-view-approve-btn"`, `data-testid="timeoff-view-refuse-btn"`, `data-testid="timeoff-view-confirm-approve"`

---

## MODULE 5 — Attendance

### 5.1 Attendance List Page

**Route:** `/attendance`

#### Filter Bar
```
[Search by employee] [Employee ▾] [Date Range ▾] [Status ▾] [Has Exceptions ▾] [Clear]
```

#### List Columns
| Column | Width | Notes |
|---|---|---|
| Employee | 180px | Avatar + name |
| Date | 110px | - |
| Check In | 100px | Time, or "— Missing —" in red |
| Check Out | 100px | Time, or "— Missing —" in red |
| Worked Hours | 100px | Auto-computed, or "—" if missing |
| Expected Hours | 100px | From working schedule |
| Variance | 100px | +/− from expected, color coded |
| Status | 100px | Present / Late / Absent / Overtime / Exception |
| Actions | 120px | View · Edit (authorized only) |

- Exception rows (missing check-out, anomalous variance): amber background tint + warning icon
- Late rows: amber status badge
- Absent rows: red status badge
- Overtime rows: blue status badge
- Edit restricted to HR Manager+; Employee can view own records only
- `data-testid="attendance-list-row-[id]"`, `data-testid="attendance-list-edit-[id]"`

#### Status Logic
```
Late:      Check In > (Schedule Start + grace period 10min)
Overtime:  Worked Hours > Expected Hours + 30min threshold
Absent:    No check-in for a scheduled working day
Exception: Missing check-out OR Worked Hours < 2h on a full day OR manual edit flag
```

---

### 5.2 Attendance Form (Manual Entry / Correction)

**Route:** `/attendance/new` · `/attendance/[id]/edit`

```
Employee *          Date *
Check In *          Check Out
Reason for Edit *   (required on edit: dropdown — Forgot to check out / System error / Other)
Notes               (textarea)
```

- **Edit mode:** shows original values vs. new values side by side
- Audit trail: every manual edit logged (editor, timestamp, before/after values)
- Worked Hours: auto-calculated from Check In / Check Out on blur, read-only
- `data-testid="attendance-form-employee"`, `data-testid="attendance-form-checkin"`, `data-testid="attendance-form-submit"`

#### Validation
- Check In required
- Check Out must be after Check In (same day or next day for overnight shifts)
- Date cannot be in the future
- Reason required on Edit

---

## MODULE 6 — Salary Structures

### 6.1 Salary Structure List

**Route:** `/payroll/structures`

#### List Columns
| Column | Notes |
|---|---|
| Name | e.g. "Regular Monthly Salary" |
| Rules Count | Badge showing # of rules |
| Employees Assigned | Count of contracts using this structure |
| Active | Toggle switch |
| Actions | View · Edit |

---

### 6.2 Salary Structure Form

**Route:** `/payroll/structures/new` · `/payroll/structures/[id]/edit`

#### Header Fields
```
Structure Name *         Code (auto or manual, e.g. REG-SAL)
Description              Active (toggle)
```

#### Salary Rules Table (inline, sortable by sequence)
```
┌──────────────────────────────────────────────────────────────────────┐
│  Seq   Rule Name         Code    Category      Method      Amount    │
│  ────────────────────────────────────────────────────────────────── │
│  [1]   Basic Salary      BASIC   Basic         Fixed       [amount]  │
│  [2]   HRA               HRA     Allowance     % of BASIC  [40%]     │
│  [3]   Transport Allow.  TA      Allowance     Fixed       [amount]  │
│  [4]   Gross Salary      GROSS   Gross         Formula     [auto]    │
│  [5]   PF Deduction      PF      Deduction     % of BASIC  [12%]     │
│  [6]   Net Salary        NET     Net           Formula     [auto]    │
│  ────────────────────────────────────────────────────────────────── │
│  [+ Add Rule]                              [Remove selected]         │
└──────────────────────────────────────────────────────────────────────┘
```
- Rows drag-to-reorder (updates Sequence)
- Inline editing of each row (click cell to edit)
- `+ Add Rule`: adds a new inline row
- Each row has a delete (×) button on hover
- `data-testid="structure-rule-row-[index]"`, `data-testid="structure-add-rule-btn"`

---

## MODULE 7 — Salary Rules

### 7.1 Salary Rule List

**Route:** `/payroll/rules`

#### List Columns
| Column | Notes |
|---|---|
| Name | Rule full name |
| Code | Monospace, e.g. BASIC, HRA |
| Category | Badge: Basic / Allowance / Gross / Deduction / Net |
| Sequence | Number (lower = executes first) |
| Computation | Fixed / Percentage / Formula |
| Active | Toggle |
| Actions | Edit |

---

### 7.2 Salary Rule Form

**Route:** `/payroll/rules/new` · `/payroll/rules/[id]/edit`

```
Name *                   Code *  (unique, no spaces, uppercase)
Category *               Sequence *
Computation Method *     (Fixed / Percentage / Formula)

── If Fixed ──
Amount *                 (numeric)

── If Percentage ──
Percentage *             (numeric, e.g. 40)
Of Rule *                (select existing rule by code, e.g. BASIC)
  → Preview: "40% of [BASIC]"

── If Formula ──
Formula Expression *     (code editor, single line)
  → Available variables: BASIC, GROSS, [any rule code], employee.wage
  → Preview computed example (with sample values)

Description              (textarea)
Active                   (toggle)
```

- Code field: auto-uppercased, spaces auto-converted to underscores
- Formula editor: syntax highlighting, monospace font, live validation
- `data-testid="rule-form-code"`, `data-testid="rule-form-computation"`, `data-testid="rule-form-formula"`, `data-testid="rule-form-submit"`

#### Formula Editor Behavior
- Autocomplete on `[` → shows available rule codes
- Error highlight if referenced code does not exist
- "Test Formula" button: enter a sample wage, shows computed output
- `data-testid="rule-formula-test-btn"`, `data-testid="rule-formula-test-result"`

---

## MODULE 8 — Payruns

### 8.1 Payrun List Page

**Route:** `/payroll/payruns`

#### Filter Bar
```
[Search by name or period] [Status ▾] [Period ▾] [Structure ▾] [Clear]
```

#### List Columns
| Column | Width | Notes |
|---|---|---|
| Payrun Name | 200px | e.g. "August 2025 Payroll" |
| Period | 160px | "Aug 1 – Aug 31, 2025" |
| Salary Structure | 160px | - |
| Employees | 100px | Count |
| Total Net | 120px | Currency sum |
| Status | 110px | Draft / Computed / Validated / Paid |
| Created By | 140px | Name |
| Actions | 120px | View · (action based on status) |

- Paid rows: muted, lock icon in status badge
- `data-testid="payrun-list-row-[id]"`, `data-testid="payrun-list-view-[id]"`

---

### 8.2 Payrun Creation Wizard

**Route:** `/payroll/payruns/new`

> **NO DB write until Step 2 is confirmed. Wizard is purely frontend state until final Create action.**

#### Wizard Shell
```
┌──────────────────────────────────────────────────────────────┐
│  Create New Payrun                                    × Close│
│  ─────────────────────────────────────────────────────────── │
│  [● Step 1: Define Scope] ──── [○ Step 2: Select Employees] │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  [STEP CONTENT]                                              │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│  [Cancel]                              [Back] [Continue →]   │
└──────────────────────────────────────────────────────────────┘
```
- Progress indicator: steps shown as dots/pills with labels
- Cancel: confirm dialog "Discard this payrun setup?" [Cancel] [Discard]
- `data-testid="payrun-wizard-step1"`, `data-testid="payrun-wizard-step2"`

#### Step 1 — Define Scope
```
Payrun Name *            (auto-suggested: "August 2025 – Regular Salary", editable)
Salary Structure *       (searchable select)
Period Start Date *      (date picker)
Period End Date *        (date picker, must be after start)

── Preview ──
Period Duration:  31 days
Structure Rules:  6 rules configured
```
- On Salary Structure select: show a mini preview of the structure's rule list
- Name auto-generates from structure name + period month/year; user can override
- `data-testid="payrun-wizard-name"`, `data-testid="payrun-wizard-structure"`, `data-testid="payrun-wizard-period-start"`, `data-testid="payrun-wizard-continue-btn"`

#### Step 2 — Select Employees
```
Select Employees for this Payrun
Period: Aug 1 – Aug 31, 2025

[Search employees...] [Department ▾] [Select All] [Deselect All]

┌─────────────────────────────────────────────────────────────┐
│ ☑  Avatar  John Smith       Engineering    Regular Salary   │
│ ☑  Avatar  Jane Doe         Marketing      Regular Salary   │
│ ☐  Avatar  Bob Lee          Engineering    Freelance        │
│ ─── WARNING: No valid contract for this period ────────     │
│ ☑  Avatar  Alice Wang       HR             Regular Salary   │
└─────────────────────────────────────────────────────────────┘

Selected: 3 of 4 eligible employees
⚠ 1 employee has a contract mismatch warning

[← Back]                              [Create Payrun (3 employees)]
```
- Employees without a valid contract for the period: shown with warning row, pre-unchecked, cannot be selected
- Employees already in another payrun for same period: shown with info, pre-unchecked, can still be selected (override allowed)
- Select All selects only eligible (no warnings)
- `data-testid="payrun-wizard-employee-checkbox-[id]"`, `data-testid="payrun-wizard-create-btn"`

#### Create Payrun Action
- Shows loading state on button: spinner + "Creating..."
- On success: redirect to Payrun Processing Screen
- On error: error toast + stay on wizard
- `data-testid="payrun-wizard-create-btn"`

---

### 8.3 Payrun Processing Screen

**Route:** `/payroll/payruns/[id]`

#### Header
```
August 2025 Payroll                     Status: [Computed]
Regular Salary · Aug 1 – Aug 31, 2025
Created by: Jane HR · Aug 15, 2025

[Compute Payslips]  [Validate]  [Mark as Paid]  [Send Payslips]
       ↑ buttons enabled/disabled based on current status
```

#### Status Lifecycle & Button Logic
| Status | Compute | Validate | Mark Paid | Send Payslips |
|---|---|---|---|---|
| Draft | ✅ Enabled | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| Computed | ❌ (Re-compute) | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| Validated | ❌ Disabled | ❌ Disabled | ✅ Enabled | ❌ Disabled |
| Paid | ❌ Disabled | ❌ Disabled | ❌ Disabled | ✅ Enabled |

- Each action button: shows loading spinner while processing
- Compute: "Computing..." progress indicator, may take a few seconds
- `data-testid="payrun-action-compute"`, `data-testid="payrun-action-validate"`, `data-testid="payrun-action-markpaid"`, `data-testid="payrun-action-send"`

#### Warnings Panel (shown between header and payslip list)
```
┌────────────────────────────────────────────────────────┐
│ ⚠ 3 warnings require attention before validation       │
│                                                        │
│ 🔴 John Smith — Missing bank details                  │
│ 🟡 Jane Doe — Duplicate payslip detected              │
│ 🟡 Bob Lee — Attendance data incomplete               │
│                                                        │
│ [Dismiss All Warnings]                                 │
└────────────────────────────────────────────────────────┘
```
- Each warning links to the relevant employee or payslip
- Validate button disabled if any red (blocking) warnings remain
- Yellow warnings: non-blocking, show confirm dialog on Validate
- `data-testid="payrun-warnings-panel"`, `data-testid="payrun-warning-[index]"`

#### Payslip Summary Table
| Column | Notes |
|---|---|
| Employee | Avatar + name |
| Department | - |
| Basic | Currency |
| Gross | Currency |
| Deductions | Currency |
| Net | Currency |
| Status | Computed / Validated / Paid |
| Actions | View Payslip |

- Summary totals row at bottom (bold): sum of all columns
- Click row → opens payslip detail
- `data-testid="payrun-payslip-row-[id]"`, `data-testid="payrun-payslip-view-[id]"`

---

### 8.4 Payslip Detail Screen

**Route:** `/payroll/payslips/[id]`

#### Header
```
Payslip — John Smith                    Status: [Validated]
August 2025 · Regular Salary · 22 worked days

[Print PDF]  [← Back to Payrun]
```

#### Employee Summary Section
```
┌──────────────────────────────────────────────────────┐
│  [Avatar]  John Smith                                │
│            Engineering · Senior Developer            │
│            EMP-000042 · john@company.com             │
│                                                      │
│  Contract: Full-time · $5,000/month                  │
│  Schedule: Standard 40h                              │
│  Period: Aug 1, 2025 – Aug 31, 2025                  │
│  Worked Days: 22 / 23 scheduled                      │
└──────────────────────────────────────────────────────┘
```

#### Salary Computation Section
```
┌──────────────────────────────────────────────────────────────┐
│  EARNINGS                                                    │
│  ──────────────────────────────────────────────────────────  │
│  Basic Salary           BASIC        Fixed           5,000   │
│  House Rent Allowance   HRA          40% of BASIC    2,000   │
│  Transport Allowance    TA           Fixed             500   │
│  ──────────────────────────────────────────────────────────  │
│  Gross Salary           GROSS        Auto             7,500  │
│                                                              │
│  DEDUCTIONS                                                  │
│  ──────────────────────────────────────────────────────────  │
│  Provident Fund         PF           12% of BASIC      600   │
│  Professional Tax       PT           Fixed              200   │
│  ──────────────────────────────────────────────────────────  │
│  Total Deductions                                   (800)    │
│                                                              │
│  ══════════════════════════════════════════════════════════  │
│  Net Salary             NET                         6,700    │
└──────────────────────────────────────────────────────────────┘
```
- Earnings: green tint header
- Deductions: red tint header
- Net: bold, large text, accent color
- Each row: Rule Name | Code (monospace, muted) | Method description | Amount
- `data-testid="payslip-computation-table"`, `data-testid="payslip-net-salary"`

#### Print PDF Action
- Opens PDF in new tab (or triggers browser download based on browser)
- PDF layout must include: company name/logo, employee details, pay period, full computation table, generated date
- `data-testid="payslip-print-pdf-btn"`

---

### 8.5 Payslips List Page

**Route:** `/payroll/payslips`

#### Filter Bar
```
[Search by employee name] [Payrun ▾] [Period ▾] [Status ▾] [Department ▾] [Clear]
```

#### List Columns
Same as Payrun's payslip summary table, plus a "Payrun" column linking to parent payrun.

---

## MODULE 9 — Payroll Dashboard

**Route:** `/reports` or `/dashboard`

> **Every number on this dashboard is live. No mocked data. All queries run against actual records.**

### 9.1 Dashboard Header
```
Payroll Dashboard

Filters:  [Period ▾ Aug 2025]  [Department ▾ All]  [Employee Type ▾ All]  [Apply] [Reset]
```
- Filters apply to all widgets simultaneously
- Apply button triggers re-query (with skeleton loader on each widget)
- `data-testid="dashboard-filter-period"`, `data-testid="dashboard-filter-dept"`, `data-testid="dashboard-apply-btn"`

---

### 9.2 KPI Cards Row
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Total Net  │ │ Payslips   │ │ Average    │ │ Approved   │ │ Attendance │
│ Salary     │ │ Generated  │ │ Salary     │ │ Time Off   │ │ Health     │
│ $142,500   │ │ 47         │ │ $3,032     │ │ 23 days    │ │ 94.2%      │
│ +3% vs    │ │ this period│ │ per employee│ │ this period│ │ ↑ from 91%│
│ last month │ │            │ │            │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
```
- Each card: large number (text-3xl bold), label, trend indicator (↑↓ % vs previous period)
- Trend: green if positive, red if negative, gray if neutral
- Click each card: navigates to relevant list with filter pre-applied
- Loading: skeleton pulse animation on the number area
- `data-testid="dashboard-kpi-total-net"`, `data-testid="dashboard-kpi-payslips"`, etc.

---

### 9.3 Charts Row

#### Chart 1: Salary Cost by Department (Bar)
```
Engineering   ████████████████  $52,000
Marketing     ████████          $28,000
HR            ██████            $19,500
Operations    ████              $14,000
              $0       $30k      $60k
```
- Horizontal bar chart (easier to read with long dept names)
- Bars clickable: filters dashboard to that department
- Tooltip on hover: exact amount, employee count, % of total
- `data-testid="dashboard-chart-dept-salary"`

#### Chart 2: Monthly Net Salary Trend (Line)
```
$160k  ●
$140k      ●      ●
$120k           ●
       Mar  Apr  May  Jun  Jul  Aug
```
- Line chart, last 6 months
- Points clickable: opens payrun list for that month
- Tooltip: month label, total net, payslip count
- `data-testid="dashboard-chart-monthly-trend"`

---

### 9.4 Operational Alerts Section
```
┌──────────────────────────────────────────────────────────────┐
│ Operational Alerts                              [View All]   │
│                                                              │
│ 🔴 2 Payruns in Draft — not yet processed this period       │
│    [View Payruns →]                                          │
│                                                              │
│ 🟡 5 Employees missing bank details                         │
│    [View Employees →]                                        │
│                                                              │
│ 🟡 1 Duplicate payslip detected (Bob Lee, Aug 2025)         │
│    [View Payslip →]                                          │
│                                                              │
│ 🔵 3 Contracts expiring within 30 days                      │
│    [View Contracts →]                                        │
└──────────────────────────────────────────────────────────────┘
```
- Red: blocking issues (payroll cannot proceed)
- Yellow: warnings (action recommended)
- Blue: informational
- Each alert has a direct action link
- `data-testid="dashboard-alerts-panel"`, `data-testid="dashboard-alert-[index]"`

---

### 9.5 Attendance Overview Section
```
┌────────────────────────────────────────────────────────────────┐
│ Attendance Overview — Aug 2025                                 │
│                                                                │
│  Present    ████████████████ 892  (87%)                        │
│  Late       ████             78   (7.6%)                       │
│  Absent     ██              41   (4%)                          │
│  Overtime   █               14   (1.4%)                        │
│                                                                │
│  Missing Check-Outs:    6   [Review →]                         │
│  Manual Edits:         12   [Audit Log →]                      │
│  Coverage:           94.2%                                     │
└────────────────────────────────────────────────────────────────┘
```
- Mini horizontal bar chart
- Clickable rows: navigate to attendance list filtered by status
- `data-testid="dashboard-attendance-overview"`

---

### 9.6 Time Off Overview Section
```
┌───────────────────────────────────────────────────┐
│ Time Off Overview — Aug 2025                      │
│                                                   │
│  Approved Days Taken:      89 days                │
│  Pending Requests:          4  [Review →]          │
│                                                   │
│  By Leave Type:                                   │
│  Annual Leave     ██████  52 days                 │
│  Sick Leave       ████    31 days                 │
│  Other            █        6 days                 │
└───────────────────────────────────────────────────┘
```
- `data-testid="dashboard-timeoff-overview"`

---

### 9.7 Department Breakdown Table
```
┌────────────────────────────────────────────────────────────────┐
│ Department Breakdown                                           │
│                                                                │
│  Department    Headcount   Avg Salary   Total Salary   % Share │
│  Engineering       12       $4,333       $52,000        36.5%  │
│  Marketing          8       $3,500       $28,000        19.6%  │
│  HR                 6       $3,250       $19,500        13.7%  │
│  Operations         5       $2,800       $14,000         9.8%  │
│  ──────────────────────────────────────────────────────────── │
│  Total             47       $3,032      $142,500       100%    │
└────────────────────────────────────────────────────────────────┘
```
- Sortable columns
- Row click → navigate to employee list filtered by department
- `data-testid="dashboard-dept-breakdown-table"`, `data-testid="dashboard-dept-row-[dept]"`

---

## CROSS-CUTTING UI PATTERNS

### Confirmation Dialogs (all destructive actions)
```
┌────────────────────────────────┐
│  Delete Employee?              │
│                                │
│  This will permanently delete  │
│  John Smith and all related    │
│  records. This cannot be       │
│  undone.                       │
│                                │
│  [Cancel]        [Delete]      │
└────────────────────────────────┘
```
- Modal, centered, max-width 400px
- Danger button text = exact action label ("Delete", "Deactivate", "Refuse")
- Cancel: always leftmost, always secondary/ghost style
- `data-testid="confirm-dialog"`, `data-testid="confirm-dialog-confirm"`, `data-testid="confirm-dialog-cancel"`

### Empty States (all lists)
Every list page must define:
- Illustration (simple SVG or icon)
- Title: "No [entities] found" or "No [entities] yet"
- Subtitle: context-specific guidance
- CTA button if user has permission to create
- `data-testid="empty-state-[module]"`

### Skeleton Loaders
- Used for: initial page load, filter change, pagination
- Mimic the layout of actual content (not generic gray bars)
- Animate with pulse (opacity 0.5 ↔ 1, 1.5s loop)
- `data-testid="skeleton-[module]"`

### Form Dirty State
- If user navigates away from an unsaved form: browser dialog "You have unsaved changes. Leave anyway?"
- Or custom in-app modal with [Stay] [Leave without saving]

### Pagination Pattern
```
[← Previous]  1  2  [3]  4  5  ...  12  [Next →]
Showing 41–60 of 234 records   [20 per page ▾]
```
- Current page: bold, primary color
- `data-testid="pagination-prev"`, `data-testid="pagination-next"`, `data-testid="pagination-page-[n]"`, `data-testid="pagination-per-page"`

### Inline Sorting
- Clickable column headers with ↑↓ sort indicators
- Multi-sort: Shift+click adds secondary sort
- Sort state preserved across page navigations (URL query params: `?sort=name&dir=asc`)

### URL State Management
All filters, search, sort, and pagination must be reflected in URL query params so pages are shareable and browser back/forward work correctly:
```
/employees?search=john&department=engineering&status=active&sort=name&dir=asc&page=2
```

### Role-Based UI Rendering
- Never show disabled buttons for unauthorized actions — hide them entirely
- Exception: show disabled `Edit` buttons with tooltip "You don't have permission to edit contracts" when role is close but insufficient
- `data-testid` attributes must still be present on hidden elements (use `aria-hidden` not `display:none` where possible for testing)

### Responsive Breakpoints
| Breakpoint | Width | Layout Changes |
|---|---|---|
| Mobile | < 768px | Single column, collapsible nav, stacked form fields, horizontal scroll tables |
| Tablet | 768–1279px | Two-column forms, condensed nav labels, simplified tables (hide less-critical columns) |
| Desktop | 1280px+ | Full layout as spec'd above |

---

## PLAYWRIGHT TEST COVERAGE GUIDE

Every module must be testable with the following Playwright test categories:

### Per Module Test Cases
1. **Happy Path** — Create, view, edit, delete a record end-to-end
2. **Validation** — Submit empty form, submit invalid data, verify error messages
3. **Permissions** — Log in as each role, verify accessible/inaccessible actions
4. **Empty State** — Verify empty state renders when no records exist
5. **Filtering** — Apply each filter, verify results, clear filters
6. **Pagination** — Navigate pages, change per-page, verify counts
7. **Sorting** — Sort each sortable column ascending and descending

### Critical Flow Tests
1. Employee → Contract → Schedule → Payrun → Payslip (full lifecycle)
2. Time Off Type → Allocation → Request → Approve → Balance deduction verification
3. Payrun wizard Step 1 → Step 2 → Create → Compute → Validate → Mark Paid → Send Payslips
4. Dashboard reflects live data after payrun is marked paid

### `data-testid` Naming Convention
```
[module]-[component]-[action-or-identifier]

Examples:
employee-form-name
employee-form-submit
employee-list-row-{id}
employee-smartbtn-contracts
contract-form-wage
payrun-wizard-step1-continue
payrun-wizard-employee-checkbox-{id}
payrun-wizard-create-btn
payrun-action-compute
payslip-computation-table
payslip-net-salary
payslip-print-pdf-btn
dashboard-kpi-total-net
dashboard-filter-period
dashboard-chart-dept-salary
timeoff-request-approve-{id}
attendance-list-row-{id}
confirm-dialog-confirm
toast-success
toast-error
pagination-next
empty-state-{module}
skeleton-{module}
```

---

## TEAMMATE SPLIT

| Part | Modules | Key Screens |
|---|---|---|
| **Part 1** | Employees · Contracts · Schedules · Salary Structures · Salary Rules · Time Off Types & Allocations | Employee list/form/view, Contract list/form, Schedule form with auto-hours, Structure form with rule table, Rule form with formula editor, Time Off type/allocation screens |
| **Part 2** | Attendance · Time Off Requests · Role-Based Access · Global Navigation · Smart Buttons | Attendance list with exception highlighting, manual correction form, Request list with approval workflow, Request form with balance preview, Role guards on all actions |
| **Part 3** | Payrun Wizard · Payrun Processing · Payslip Detail · PDF · Bulk Email · Payroll Dashboard | Wizard (2 steps, no premature DB write), Processing screen with status lifecycle, Payslip computation table, PDF output, Dashboard with all KPIs/charts/alerts/tables |

---

*This document is the complete, authoritative frontend specification. Every screen, state, field, validation, interaction, and test hook is defined here. Build nothing that contradicts it. Add nothing not derived from it without flagging it as an extension.*
