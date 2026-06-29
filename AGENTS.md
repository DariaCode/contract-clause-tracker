# AGENTS.md

Guidance for AI coding agents working in this repository. Keep changes small,
typed, and consistent with what's already here.

## What this is

Contract Clause Tracker ("Clausebook") — upload contracts, label single
sentences with clause types, browse a dashboard. **FastAPI + PostgreSQL**
backend, **Angular 21** frontend, Docker for everything.

```
backend/   FastAPI app, SQLAlchemy models, tests
frontend/  Angular 21 (standalone, signals, zoneless) + SCSS
docker-compose.yml   db + backend + frontend
```

## Run / build / test

```bash
docker compose up --build        # whole stack → app :80, API :8000/docs

# backend (Python 3.12 — NOT 3.14, some wheels lag)
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest                           # always run before declaring backend work done
uvicorn app.main:app --reload

# frontend
cd frontend && npm install
npm start                        # ng serve :4200, proxies /api → :8000
npx ng build --configuration development   # type-check + build
```

Always verify: **`pytest` for backend changes, `ng build` for frontend
changes.** Don't claim done without one of these passing.

## Formatting & linting

Run automatically on `git commit` via a Husky **pre-commit hook** (root
`package.json` + `.lintstagedrc.json`): lint-staged formats/lints only the
changed files — Prettier + ESLint + Stylelint for `frontend/`, Ruff for `backend/`.

```bash
# one-time, per clone (the hook needs both):
npm install                 # repo root → installs husky + lint-staged, enables the hook
npm install --prefix frontend
python3.12 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements-dev.txt

# run manually:
cd frontend && npm run lint        # eslint (errors fail; a11y items are warnings)
cd frontend && npm run lint:css    # stylelint (scss blank-line rule)
cd frontend && npm run format      # prettier --write
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format .
```

- **Frontend:** ESLint (`eslint.config.js`, flat config) = `@angular-eslint` +
  `typescript-eslint`, with `eslint-config-prettier` last so it doesn't fight
  Prettier. Prettier config lives in `frontend/package.json`. Two template a11y
  rules are set to `warn` (clickable non-button elements) — a known follow-up,
  not a license to add more.
- **SCSS:** Stylelint (`frontend/.stylelintrc.json`) is intentionally minimal —
  the **only** rule is `rule-empty-line-before: never` (with `ignore:
  after-comment`), which Prettier can't enforce. It keeps nested rules compact:
  no blank line between sibling `&__element` rules, blank lines kept only before
  `// section ---` comments. `npm run lint:css:fix` autofixes.
- **Backend:** Ruff is the single tool for both format and lint
  (`backend/pyproject.toml`). FastAPI's `Depends`/`Query` are allow-listed for
  `B008` (framework idiom, not the anti-pattern). Don't reintroduce raw
  `raise HTTPException` inside an `except` without `from err` (B904).
- If the hook's Ruff step prints "skipped", the backend venv isn't set up — see
  the one-time commands above. Keep code passing lint/format; don't disable a
  rule to avoid a fix unless it's a genuine false positive (then allow-list it
  narrowly with a comment).

## Backend conventions

- **Layering:** routers (`app/routers/*`) stay thin — validation + HTTP only.
  All DB access goes through `app/crud.py`. ORM models in `app/models.py`,
  Pydantic schemas in `app/schemas.py`. Don't query the DB from a router.
- **Schemas mirror the API contract** and must stay in sync with the frontend
  `core/models.ts`. If you change a response shape, update both.
- **Sessions** come from the `get_db` dependency; never construct `SessionLocal`
  in a handler.
- **Schema changes:** tables are created with `Base.metadata.create_all` on
  startup (no migrations yet). After a model change, recreate the volume in dev:
  `docker compose down -v && docker compose up --build`. If you introduce
  Alembic, wire it into startup and document it.
- **Sentence segmentation** lives in `app/utils.py` and is intentionally
  swappable. It returns `(text, start_char, end_char)` and must keep offsets
  valid against the source (there's a test for this). This is the seam for the
  future auto-labeling step — extend here, don't scatter parsing elsewhere.
- **Tests** (`backend/tests/`) use in-memory SQLite via a `get_db` override, so
  keep models dialect-agnostic (no Postgres-only column types). Add a test for
  any new endpoint or segmentation rule.

## Frontend conventions

- **Angular 21, standalone + signals, zoneless.** No `NgModule`. Components use
  `templateUrl`/`styleUrl` and the new control flow (`@if`, `@for`, `@switch`),
  not `*ngIf`/`*ngFor`. Filenames have no `.component` suffix (`dashboard.ts`).
- **State is signals.** Use `signal`/`computed`; inject with `inject()`, not
  constructor params. Prefer `computed` for derived view data over methods.
- **`core/` is the data layer:** `models.ts` (API types, mirror the Pydantic
  schemas — snake_case on purpose, no mapping layer), one service per resource
  (`document.service.ts`, `clause-type.service.ts`, `label.service.ts`) that
  returns `Observable`s. `ui.ts` holds presentation helpers (tint, ext badge,
  dates). Keep HTTP out of components — call a service.
- **`features/` are routed screens** (`dashboard`, `document-editor`, `upload`),
  lazy-loaded in `app.routes.ts`. `shared/` holds the navbar, brand, and small
  directives.
- **API base is always the relative `/api`** (see `core/api.ts`); the dev proxy
  and nginx handle routing. Never hardcode `localhost:8000`.
- **Styling:** SCSS only, and **always use the design tokens** in
  `src/styles/_tokens.scss` — never hardcode a colour, gradient, shadow, radius,
  or font stack in a component stylesheet. Import them with
  `@use '../../../styles/tokens' as *;` and reference the bare variables, e.g.
  `$surface`, `$brand-orange`, `$r-card`, `$shadow-popover`, `$font-mono`.
  Because the tokens are imported into the global namespace, keep token names
  unique and avoid declaring local SCSS variables that shadow them.
  - **Font size & weight come from the scale**, not literals. Sizes are a
    compact **rem** t-shirt scale on clean 0.125rem (2px) steps, responsive to
    the root font size: `$fs-2xs $fs-xs $fs-sm $fs-md $fs-lg $fs-xl`
    (10/12/14/16/18/24px). Weights:
    `$fw-medium | $fw-semibold | $fw-bold` (400 is the inherited default). Pick the nearest step —
    don't reintroduce px font sizes or per-size tokens. Use `rem` (not `px`) for
    any new font sizing so it scales with user preference.
  - If a value you need doesn't have a token yet, **add a well-named token to
    `_tokens.scss` first**, then use it — don't inline the literal. Group it with
    the related tokens (brand / neutrals / status / radius / shadow / fonts) and
    add a short comment on where it's used.
  - The one exception is `core/ui.ts`'s `CUSTOM_PALETTE` — those hexes are
    runtime data (assigned to new clause types and sent to the API), not styling;
    keep them in TS. They mirror the `$custom-palette` SCSS list.
  - Per-component styles are scoped; global resets live in `styles.scss`.
  - Quick audit for stray literals (should print nothing but `core/ui.ts`):
    `grep -rnoE '#[0-9a-fA-F]{3,8}' frontend/src/app frontend/src/styles.scss | grep -v _tokens.scss`
- **Class naming — BEM** (`block__element--modifier`). Each component is one
  block named after it (`navbar`, `dashboard`, `editor`, `upload`); descendants
  are `block__element` (flat — don't chain elements like `__a__b`); variants are
  `block__element--modifier` (e.g. `dashboard__badge--gray`). Use `is-*` state
  classes for interactive/runtime state (`is-active`, `is-open`, `is-focused`,
  `is-dragging`) toggled via `[class.is-…]`. Write the SCSS with `&__element` /
  `&--modifier` nesting under the block. If a template class is used as a JS hook
  (e.g. the popover's `editor__search-input` read in `onKey`), update both sides
  together.
- **Shared style fragments are mixins** in `src/styles/_mixins.scss` (`@use`'d
  alongside tokens). Prefer them over repeating declarations:
  `@include flex-center` / `inline-flex-center` (the display+align pair),
  `@include mono($size, $color)` (monospace meta/badges), `@include eyebrow`
  (mono uppercase kicker), `@include bar-track` (progress/coverage track). Add a
  mixin when a multi-line pattern recurs ~3+ times; don't over-abstract one-offs.
- **Local SCSS variables on top.** Put structural literals that repeat or carry
  meaning (widths, heights, grid templates, paddings) in a `$kebab-name` block
  at the top of the component stylesheet and reference them below — e.g.
  `$reader-max: 680px;` then `max-width: $reader-max;`. Keep these for
  *layout/dimensions* only; colours, radii, shadows, fonts, **font sizes and
  weights** all come from the shared design tokens, not local vars. Name them so
  they can't shadow a token.

## Domain rules (don't break these)

- A clause is **one sentence**. Labeling targets sentences, not ranges.
- The UI treats a sentence as having **one clause type** — applying a label
  *replaces* any existing one (see `document-editor.ts#applyLabel`). The API
  itself allows multiple labels per sentence (unique on
  `(sentence_id, clause_type_id)`); keep that flexibility on the backend.
- **Markdown headings** (`#…`) are shown as structure and are **not labelable**;
  they're excluded from sentence/candidate counts.
- Clause-type **hotkeys (1–9, 0)** are derived from API order, so
  `list_clause_types` must stay ordered by `id`.
- User-created clause types get `is_custom = true` (drives the CUSTOM badge) and
  the next colour from `CUSTOM_PALETTE` in `core/ui.ts`.

## Design system quick reference

Tokens in `frontend/src/styles/_tokens.scss`. Brand orange `#f2683c`, orange
tint `#fdeee8`. Fonts: Hanken Grotesk (UI), IBM Plex Mono (meta/counts),
Spectral (document body). Clause colours are categorical and fixed per type
(seeded in `backend/app/seed.py`) — keep backend seed and any frontend
references aligned.

## House style

- Match surrounding code; keep comments sparse and about *why*, not *what*.
- Small, focused diffs. Don't reformat untouched code or add dependencies
  without a clear reason (the backend is meant to stay minimal).

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org):
`type(scope): short description`.

- **Types:** `feat` (new feature), `fix` (bug fix), `docs`, `style`
  (formatting only, no logic), `refactor`, `perf`, `test`, `build`, `ci`,
  `chore` (tooling/deps/housekeeping), `revert`.
- **Scope** (optional, lowercase): the area touched — e.g. `backend`,
  `frontend`, `dashboard`, `editor`, `upload`, `api`, `db`, `docker`, `deps`,
  `tokens`. Use one when it sharpens the message; omit if it'd be noise.
- **Description:** imperative mood ("add", not "added"/"adds"), lowercase
  start, **no trailing period**, and **keep the subject ≤ 50 chars** (72 hard
  max). Say what changed, concisely.
- **Body** (optional, after a blank line): wrap at ~72 chars; explain the
  *why*, not the *what*. Reference issues in a footer (`Refs #123`).
- **Breaking changes:** add `!` before the colon (`feat(api)!: …`) and/or a
  `BREAKING CHANGE:` footer.
- **One logical change per commit.** Don't mix a feature with unrelated
  formatting; that's what `style`/`refactor` commits are for.
- **No AI / tooling co-authors or attribution.** Never add
  `Co-authored-by:` lines for assistants (e.g. Claude, Gemini, Copilot), and
  never add "Generated with …" / "🤖" trailers. Commits are authored by the
  human committer only.

Examples:

```
feat(editor): add clause command popover with hotkeys
fix(backend): chain HTTPException from decode error (B904)
refactor(frontend): rename styles to BEM convention
chore(deps): add ruff and configure pyproject
docs: document pre-commit hook setup
```

> Optional follow-up: enforce this automatically with `commitlint` +
> `@commitlint/config-conventional` on a `commit-msg` Husky hook. Ask if you'd
> like it wired in.
