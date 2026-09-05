# Graph Report - odoo_final  (2026-09-05)

## Corpus Check
- 32 files · ~23,345 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 148 nodes · 500 edges · 11 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `Card()` - 21 edges
2. `CardBody()` - 21 edges
3. `Breadcrumb()` - 21 edges
4. `PageHeader()` - 21 edges
5. `Button` - 20 edges
6. `Badge()` - 18 edges
7. `Input` - 16 edges
8. `employees` - 15 edges
9. `Select` - 14 edges
10. `Avatar()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Layout()` --calls--> `getSession()`  [EXTRACTED]
  payroll-dashboard/src/App.jsx → payroll-dashboard/src/lib/user.js
- `BarChart()` --calls--> `formatCurrency()`  [EXTRACTED]
  payroll-dashboard/src/pages/Dashboard.jsx → payroll-dashboard/src/data/mockData.js
- `LineChart()` --calls--> `formatCurrency()`  [EXTRACTED]
  payroll-dashboard/src/pages/Dashboard.jsx → payroll-dashboard/src/data/mockData.js
- `PayrunDetail()` --calls--> `getStatusColor()`  [EXTRACTED]
  payroll-dashboard/src/pages/PayrunDetail.jsx → payroll-dashboard/src/data/mockData.js
- `Dashboard()` --calls--> `formatCurrency()`  [EXTRACTED]
  payroll-dashboard/src/pages/Dashboard.jsx → payroll-dashboard/src/data/mockData.js

## Communities (11 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (21): Badge(), Breadcrumb(), Button, Card(), CardBody(), CardHeader(), Input, PageHeader() (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (21): Modal(), Select, allocations, attendance, contracts, departments, employees, formatDate() (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (23): dependencies, react, react-dom, react-router-dom, devDependencies, autoprefixer, oxlint, postcss (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (15): ToastContainer(), toastState, useToast(), ALL_NAV_ITEMS, MobileNav(), Topbar(), Avatar(), Dropdown() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (12): AlertItem(), KPICard(), alerts, chartData, formatCurrency(), kpiData, BarChart(), Dashboard() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (8): getInitials(), EmployeeForm(), employmentStatusOptions, employmentTypeOptions, formatDate(), genderOptions, initialFormData, paymentMethodOptions

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (6): Pagination(), payruns, PayrunsList(), periodOptions, statusOptions, structureOptions

### Community 7 - "Community 7"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **41 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `private`, `version` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._