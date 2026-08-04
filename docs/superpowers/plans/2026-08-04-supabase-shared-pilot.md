# Supabase Shared Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the Brain27 pipeline in the shared Supabase project.

**Architecture:** A small Supabase REST client replaces browser-local persistence. The static application receives only the public project URL and anon key, while SQL defines public pilot RLS policies.

**Tech Stack:** Static ES modules, Supabase PostgREST, PostgreSQL.

## Global Constraints

- Never place database passwords or service keys in the repository.
- Keep the public no-login pilot limited to non-sensitive administrative data.

---

### Task 1: Create public pilot schema

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Apply schema through the Supabase SQL editor**

Create `opportunities` and `implementations`, enable RLS, and add public pilot read/write policies.

- [ ] **Step 2: Verify tables in the Supabase Table Editor**

Expected: both tables are visible with no service key required.

### Task 2: Connect the application

**Files:**
- Create: `supabase-config.js`
- Modify: `app.js`, `index.html`, `README.md`
- Test: `opportunity-management.test.mjs`

- [ ] **Step 1: Write a failing source test**

Assert the app imports the shared client and no longer calls `localStorage`.

- [ ] **Step 2: Implement REST client and async rendering**

Load, insert, update and delete records via the public Supabase endpoint, displaying a visible connection error when a request fails.

- [ ] **Step 3: Run `npm test && npm run check`**

Expected: all tests pass.

### Task 3: Publish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the public-pilot constraint and deployment**
- [ ] **Step 2: Commit and push `main`**
