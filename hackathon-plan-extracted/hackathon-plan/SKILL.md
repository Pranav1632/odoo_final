---
name: hackathon-plan
description: >
  Use this skill whenever the user types `/hackathon-plan` or asks to plan, scope, or build out a hackathon project. Triggers on: "/hackathon-plan", "help me plan my hackathon", "hackathon build plan", "plan my hack", "hackathon project plan", "create build plan for hackathon". This skill runs a full structured pipeline: light grilling to sharpen the idea, deep web research (tech stacks, APIs, prior art, feasibility, judging), teammate role splitting with mode selection, deep stress-test grilling, and final generation of a master BUILD.md + per-teammate BUILD files + INTEGRATION.md — all locked so AI agents build exactly what is specified with zero creative freedom.
---

# `/hackathon-plan` Skill

A full hackathon co-pilot. Takes a raw idea → produces locked, agent-ready build specifications.

**Never skip phases. Always run them in order.**

---

## PHASE 0 — Parse the trigger

When the user types `/hackathon-plan [idea]`, extract:
- `IDEA` — what they described (can be vague, that's fine)
- `HACKATHON_CONTEXT` — theme, duration, judging criteria (if mentioned)
- `TEAM_SIZE` — if mentioned, note it; otherwise ask in Phase 3

If no idea is provided after `/hackathon-plan`, ask: *"What's your hackathon idea? Even a rough concept works — we'll sharpen it together."*

---

## PHASE 1 — Light Grill (Before Research)

**Goal:** Sharpen the idea enough for meaningful research. Don't over-question — max 5 questions, ask them all at once.

Ask sharp, specific questions like:
- What problem does this solve, and for whom exactly?
- What's the "wow moment" — what should a judge feel in 30 seconds of seeing this?
- What's your hackathon duration and theme/track (if any)?
- Are there any hard constraints? (must use a sponsor API, must be mobile, etc.)
- What's your rough team size, and do you know each teammate's main skill?

Wait for answers before proceeding. Summarize the refined idea in 2-3 sentences and confirm with user before moving to research.

---

## PHASE 2 — Deep Research

**Use web search extensively.** Do not rely on training knowledge alone for tools, APIs, or libraries — search for current options.

Run research across ALL of these areas in parallel (search multiple queries):

### 2a. Prior Art & Similar Projects
- Search for existing projects solving the same problem
- Note what they do well and where they fall short
- Identify if this idea is differentiated enough to win

### 2b. Tech Stack Analysis
- Research 2-3 viable stacks for this idea
- Compare on: setup speed, team familiarity fit, deployment ease, demo-ability
- Pick a recommended stack with clear reasoning
- Read: `references/stack-evaluation.md` for evaluation criteria

### 2c. APIs & Tools
- Search for every API, SDK, or service that could accelerate this build
- Note: free tier limits, auth complexity, setup time
- Flag any sponsor APIs if this is a sponsored hackathon track

### 2d. Judging Criteria Analysis
- If theme/track is known, research what judges for that hackathon typically value
- Map features to judging dimensions (innovation, technical complexity, impact, polish)

### 2e. Feasibility Check
- Given the team size and hackathon duration, estimate realistic scope
- Flag what must be built vs. what should be mocked/faked for the demo
- Identify the riskiest parts of the build

**After research**, present findings as a structured summary:
```
## Research Summary
**Recommended Stack:** ...
**Key APIs/Tools:** ...
**Competitive Differentiation:** ...
**Judging Fit:** ...
**Scope Reality Check:** ...
**Top Risks:** ...
```

---

## PHASE 3 — Teammate Split

Ask the user to pick a mode:

> "How should I split the work across your team?"
> - **Mode A — I'll define roles**: Tell me each teammate's role (frontend, backend, ML, DevOps, etc.) and I'll assign tasks to each
> - **Mode B — Just the count**: Tell me how many people, I'll auto-assign roles based on what this project needs
> - **Mode C — Tell me skills**: Describe each teammate's strongest skills, I'll balance work to fit

After mode selection, ask for the relevant input (roles / count / skills).

Then produce a **Team Assignment Plan**:
```
## Team Split
**[Name/Role 1]:** owns X, Y, Z — integrates via [contract point]
**[Name/Role 2]:** owns A, B, C — integrates via [contract point]
...

## Shared Contracts (defined before anyone starts building)
- API endpoint shapes
- Shared types / data models
- Environment variables / config schema
- Auth flow ownership
```

Read `references/split-patterns.md` for recommended split patterns by team size and project type.

---

## PHASE 4 — Deep Grill (After Research + Plan)

**Goal:** Stress-test the full plan. Find holes before writing the build spec.

Ask pointed questions across these dimensions — all at once, numbered:

1. **Integration risk**: Where do the teammates' work pieces connect? What breaks if one is late?
2. **Demo path**: What exactly happens during the 3-minute demo? Is every step in the build plan?
3. **Scope creep**: What features are you tempted to add that aren't in the plan yet?
4. **Fallback**: If the hardest technical piece fails, what's the backup?
5. **Judge bait**: What's the single most impressive thing a non-technical judge will see?
6. **Time math**: Walk me through hour-by-hour for the first 4 hours — does this plan hold?

Wait for answers. Update the plan based on responses. Confirm final plan before generating output.

---

## PHASE 5 — Output Generation

Generate three files. Be exhaustive. These files are instructions for AI agents — leave nothing ambiguous.

### File 1: `BUILD.md` (Master)

```markdown
# BUILD.md — [Project Name]
> ⚠️ AGENT INSTRUCTIONS: Build ONLY what is listed here. Do not add features, do not infer requirements, do not improve on the spec. If something is unclear, output a comment `// UNCLEAR: [question]` and stop. Do not proceed past unclear points.

## Project Overview
[2-3 sentence description]

## Tech Stack
[Exact stack with versions where known]

## Shared Contracts (ALL agents must honor these)
### Data Models
[Every shared type defined explicitly]

### API Endpoints
[Every endpoint: method, path, request body shape, response shape, auth required]

### Environment Variables
[Every env var, what it's for, who owns setting it]

### File Structure (root)
[Full directory tree of the entire project]

## Team Overview
| Teammate | Role | Owns | Integrates With |
|----------|------|------|-----------------|
| ...      | ...  | ...  | ...             |

## DO NOT Section (applies to all agents)
- Do not add any feature not listed in this document
- Do not change shared contract definitions
- Do not rename files or folders
- Do not install packages not listed in the tech stack
- Do not use your own judgment to "improve" the code
```

### File 2: `BUILD_[role].md` (one per teammate)

```markdown
# BUILD_[Role].md — [Teammate Name/Role]
> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified.

## Your Scope
[What this person owns — explicit list]

## Your Files
[Exact files this person creates, with purpose of each]

## Your Tasks (ordered by priority)
### Task 1: [Name]
- What to build: [exact description]
- File(s): [exact paths]
- Inputs: [what you receive from other teammates / APIs]
- Outputs: [what you hand off and to whom]
- Acceptance criteria: [how to know it's done]

[repeat for each task]

## Contracts You Must Honor
[Subset of shared contracts relevant to this person]

## DO NOT
- Do not build anything outside your scope list
- Do not modify files owned by other teammates
- Do not change the shared contract definitions
- Do not add packages without updating the master BUILD.md first
```

### File 3: `INTEGRATION.md`

```markdown
# INTEGRATION.md — Merge Rules & Interface Contracts

> This document defines how the pieces come together. Read this before merging any branch.

## Integration Order
[Numbered sequence: what gets built/merged first, second, etc. — with reasons]

## Interface Contracts
[Every handoff point between teammates — explicit input/output]

## Merge Rules
- Branch naming: [convention]
- Who merges what: [explicit ownership]
- What to test before merging: [checklist per person]

## What Each Agent Must NOT Touch
| File/Module | Owner | Others must not modify |
|-------------|-------|------------------------|
| ...         | ...   | ...                    |

## Demo Path (step by step)
[Every click/action in the demo, mapped to which teammate's code runs it]

## Known Integration Risks
[Risks identified in grilling, with mitigation]
```

---

## Output Delivery

After generating all three files:
1. Present them as downloadable files
2. Give a brief summary: "Here's what each file is for and who should read it"
3. Offer: "Want me to adjust any section, re-split the work, or add more detail to any task?"

---

## General Rules for This Skill

- **Always use web search** in Phase 2 — never skip research
- **Never generate BUILD files before completing all 4 phases**
- **Be specific, not generic** — every task in BUILD files must be actionable
- **No open-ended language** in BUILD files — replace "handle errors appropriately" with exact error behavior
- If the user tries to skip a phase, warn them: *"Skipping [phase] risks [specific consequence]. Are you sure?"*
