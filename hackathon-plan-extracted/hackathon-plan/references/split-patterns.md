# Team Split Patterns for Hackathons

Reference for Phase 3 — assigning work across teammates.

## Core Principle
**Integration is the #1 cause of hackathon failure.** The split must minimize the number of integration points. Fewer handoffs = less breakage.

---

## Split Patterns by Team Size

### Solo (1 person)
No split needed. Prioritize:
1. Core feature that makes the demo work
2. UI polish
3. Everything else

Recommended: Use a BaaS (Supabase, Firebase) so you don't split your own time across infra.

---

### 2-Person Team

**Pattern: Full-stack split by layer**
| Person | Owns |
|--------|------|
| Person A | Frontend (UI, state, API calls) |
| Person B | Backend (API endpoints, DB, business logic) |

Contract: Person B defines all API endpoints in a shared doc on Day 1. Person A mocks them locally, Person B implements in parallel.

**Alternative: Feature split**
| Person | Owns |
|--------|------|
| Person A | Feature 1 end-to-end (front + back) |
| Person B | Feature 2 end-to-end (front + back) |

Use when both teammates are full-stack. Cleaner integration — only shared DB schema is the contract.

---

### 3-Person Team

**Pattern: Classic 3-way**
| Person | Role | Owns |
|--------|------|------|
| Person A | Frontend | All UI, components, state management |
| Person B | Backend | API layer, business logic, DB |
| Person C | AI/Integration | AI/ML logic, third-party API integrations, glue code |

This is the best pattern for AI hackathons. Person C is the "connector" — they bridge Person A and B and handle the hardest technical piece.

**Contract points:**
- A↔B: REST API contract (endpoints, request/response shapes)
- B↔C: Service interfaces (what functions C exposes to B)
- A↔C: Any client-side AI calls (direct SDK usage from frontend)

---

### 4-Person Team

**Pattern: 4-way with dedicated DevOps/Demo**
| Person | Role | Owns |
|--------|------|------|
| Person A | Frontend | UI, components, user flows |
| Person B | Backend | Core API, DB, auth |
| Person C | AI/ML | Model integration, AI features |
| Person D | Infra + Demo | Deployment, environment, demo script, pitch |

Person D is crucial at hackathons — someone needs to own the demo path and not be heads-down coding.

**Alternative for 4-person: Feature teams**
| Pair | Owns |
|------|------|
| A + B | Core feature (full-stack) |
| C + D | Secondary feature (full-stack) |

Use when the project has two clearly distinct features. Each pair handles their own front + back.

---

### 5-Person Team

**Pattern: 5-way specialized**
| Person | Role | Owns |
|--------|------|------|
| Person A | Frontend Lead | Architecture, shared components, design system |
| Person B | Frontend Dev | Feature-specific UI pages |
| Person C | Backend Lead | API design, DB schema, auth |
| Person D | AI/Data | ML pipeline, data processing, AI APIs |
| Person E | Infra + PM | Deploy, integration testing, demo coordination |

With 5 people, Person E as PM/Infra is essential. Someone must own integration and not build features.

---

## Integration Contract Template

Always define these before splitting:

```
## Integration Contract v1
Date: [hackathon start time]
Last updated by: [name]

### API Base URL
Dev: http://localhost:8000
Prod: [Railway/Render URL — set up in first 2 hours]

### Endpoints
POST /api/[resource]
  Request: { field: type, ... }
  Response: { field: type, ... }
  Auth: Bearer token / None
  Owner: [Person B]

[repeat per endpoint]

### Shared Types
interface [TypeName] {
  field: type
  ...
}

### DB Schema (simplified)
Table: [name]
  id: uuid primary key
  [field]: [type]
  created_at: timestamp

### Environment Variables
OPENAI_API_KEY — Person C sets this
DATABASE_URL — Person B sets this
NEXT_PUBLIC_API_URL — Person A sets this to backend URL
```

---

## Split Anti-Patterns (avoid these)

### ❌ "Everyone works on everything"
No ownership = no accountability. Files get overwritten. Merge conflicts everywhere.

### ❌ Splitting by technology you haven't agreed on
If Person A picks React and Person B picks Vue, you now have two frontends.

### ❌ No designated integrator
At some point, someone must wire the pieces together. If no one owns this, it happens at 3am under maximum stress.

### ❌ Splitting AI work across multiple people
AI/ML work has the most uncertainty. One person should own it — others unblock themselves with mocked responses.

### ❌ DB schema undefined at start
If two people both write DB migrations without coordination, you get conflicts that are painful to resolve. Define schema together in the first hour, then one person owns migrations.

---

## Recommended First-Hour Checklist

After splitting, the whole team does this together:

- [ ] Repo created, everyone has push access
- [ ] Project scaffolded (frontend + backend both running locally)
- [ ] Environment variables documented in a shared doc
- [ ] API contract v1 written (even if just 3 endpoints)
- [ ] DB schema v1 agreed upon
- [ ] Deploy pipeline set up (Vercel + Railway / etc.) — do this early, not last minute
- [ ] Each person confirms their first task and what "done" looks like
- [ ] Check-in time agreed (e.g., every 3 hours)
