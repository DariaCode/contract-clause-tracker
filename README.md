# Contract Clause Tracker

Track which clauses appear in which contracts. Upload plain-text or markdown
contracts, label individual sentences (e.g. *Limitation of Liability*,
*Non-Compete*), and browse everything from a dashboard with search, filtering
and grouping.

> A legal clause is assumed to be a single sentence, so labeling operates at the
> sentence level.

## Stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Backend   | Python · FastAPI · SQLAlchemy 2.0                 |
| Database  | PostgreSQL                                        |
| Frontend  | Angular 21 (standalone, signals, zoneless) · SCSS |
| Packaging | Docker + docker-compose                           |

## Screens

- **Dashboard** — document cards with label coverage, or a "by label"
  expandable table; navbar search and a label filter.
- **Document labeling** — read the contract in a serif column and apply labels
  to sentences via an inline command popover (type to search/create a label,
  `↵` to apply the top match, `1–9` quick-pick, `esc` to close). A right rail
  shows live stats and the labels present.
- **Add a contract** (the **+ Upload** button) — drag/drop or browse a
  `.txt`/`.md` file, **or paste text** (with live sentence/word counts); the
  document is created and you jump straight into labeling.
- **Labels** (navbar → *Labels*) — manage the label catalog: view usage per
  label, create custom labels, edit any label's name / colour / hotkey, and
  delete custom labels (predefined ones are editable but not deletable).

The UI follows a high-fidelity design handoff ("Clausebook"); its tokens live in
`frontend/src/styles/_tokens.scss`.

## Run it

```bash
docker compose up --build
```

- **App:** http://localhost
- **API + Swagger docs:** http://localhost:8000/docs

The database schema is created and a starter set of labels is seeded
automatically on first boot.

### Local development (hot-reload)

Run the backend and frontend directly on your machine for instant reloads. A
`Makefile` wraps the common flows (`make help` lists them all):

```bash
make setup        # one-time: create backend venv + install all deps
make dev          # start Postgres (Docker), wait until healthy, run the API with reload
make web          # in a second terminal: Angular dev server → http://localhost:4200
```

Then open **http://localhost:4200**. `make dev` uses the Dockerised Postgres
(only the `db` container — it starts it and waits for the healthcheck so you
never hit a "connection refused"); the backend's default `DATABASE_URL` already
points at `localhost:5432`.

**No Docker at all?** Use SQLite — nothing to install or run:

```bash
make dev-sqlite   # backend on a local ./dev.db file (fresh, empty DB)
```

#### Doing it by hand (what the Make targets run)

**Backend**

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
# Needs a database. Either start Postgres first …
docker compose up -d --wait db          # from the repo root
# … or skip Postgres entirely with SQLite:
# export DATABASE_URL="sqlite:///./dev.db"
uvicorn app.main:app --reload
pytest                                    # run the tests
```

> The backend needs its database **running before** `uvicorn` starts. With
> `docker compose up` the backend waits for the db automatically; when you run
> `uvicorn` by hand you start the db yourself first (`make dev` does this for
> you). Check it with `docker compose ps db` — status should be `Up (healthy)`.

**Frontend**

```bash
cd frontend
npm install
npm start                    # ng serve on http://localhost:4200
```

`ng serve` proxies `/api` to `http://localhost:8000` via `proxy.conf.json`, so
the dev server and the Docker build use the exact same relative API paths.

Eight demo contracts live in `backend/sample_contracts/` and are seeded into an
empty database on first startup (see `backend/app/seed.py`).

## API

Base path `/api`. Full interactive docs at `/docs`.

| Method   | Endpoint                  | Purpose                                            |
| -------- | ------------------------- | -------------------------------------------------- |
| `POST`   | `/documents`               | Upload a `.txt`/`.md` contract (multipart `file`)  |
| `GET`    | `/documents`               | Dashboard list — `?search=`, `?label_id=`, `?group_by=label` |
| `GET`    | `/documents/{id}`          | Full document with sentences + annotations         |
| `DELETE` | `/documents/{id}`          | Delete a document (cascades to sentences/annotations) |
| `GET`    | `/labels`                  | List labels with per-label `documents_count`       |
| `POST`   | `/labels`                  | Create a label (`name`, `color`, `hotkey`)         |
| `PATCH`  | `/labels/{id}`             | Edit a label's name / colour / hotkey              |
| `DELETE` | `/labels/{id}`             | Delete a label (custom only; predefined → `409`)   |
| `POST`   | `/annotations`             | Apply a label to a sentence (idempotent)           |
| `DELETE` | `/annotations/{id}`        | Remove an annotation                               |

On upload the document body is segmented into sentences (with character
offsets) so it is immediately ready for labeling.

## Data model

```
Document 1───* Sentence 1───* Annotation *───1 Label
```

- **Document** — the uploaded contract: title, filename, `content_type`
  (`text`/`markdown`), raw `content`, timestamp.
- **Sentence** — an ordered slice of a document (`position`, `text`,
  `start_char`, `end_char`). Stored once at upload time so annotations are stable
  references and the dashboard can aggregate without re-parsing.
- **Label** — the catalog of labels a user can apply (name + colour +
  `is_custom`).
- **Annotation** — the join that records "this sentence has this label".
  Unique on `(sentence_id, label_id)` so the same label can't be applied to a
  sentence twice.

## Design decisions

- **FastAPI + SQLAlchemy 2.0** — minimal backend with typed Pydantic schemas
  and auto-generated OpenAPI docs. Route handlers stay thin; queries live in
  `crud.py`.
- **Sentences are persisted, not re-derived.** Labeling needs a stable target
  to point at, and the dashboard aggregates label counts per document — both
  are far simpler against rows than against re-split text on every request.
- **Segmentation is deliberately simple and swappable** (`app/utils.py`):
  blank lines / markdown headings / list items act as boundaries, and within a
  block we split on `.!?` while protecting abbreviations and decimals. It has no
  heavy NLP dependency and is the natural seam to drop in spaCy or a model later
  (see below — this is also where the pair-programming auto-labeling step plugs
  in).
- **Relative `/api` everywhere.** The Angular app always calls `/api/...`;
  `ng serve` proxies it in dev and nginx proxies it in the container. No
  build-time environment switching, and the browser talks same-origin (no CORS
  in production).
- **Frontend split into a data layer + screens.** `core/` holds the API models
  and services (the contract with the backend) plus presentation helpers;
  routed feature components (`dashboard`, `document-editor`, `upload`) consume
  them. Shared SCSS design tokens live in `src/styles/_tokens.scss`.
- **One label per sentence in the UI, many allowed in the API.** The design
  treats a sentence as having a single label, so applying one *replaces* the
  previous annotation. The backend keeps the more general many-annotations model
  (unique on `(sentence_id, label_id)`) so the constraint is a UI choice, not a
  schema limitation.
- **Custom labels.** Typing a new name in the labeling popover creates a label
  (`is_custom = true`, next colour from a rotating palette) and applies it
  immediately.

## Project layout

```
backend/
  app/
    main.py            # app wiring, CORS, table create + seed on startup
    models.py          # SQLAlchemy ORM (the schema)
    schemas.py         # Pydantic request/response contracts
    crud.py            # data-access layer
    utils.py           # sentence segmentation
    routers/           # documents, labels, annotations
  tests/               # critical-path API + segmentation tests
  sample_contracts/
frontend/
  src/app/
    core/              # API models, services, UI helpers (the data layer)
    features/          # dashboard, document-editor, upload screens
    shared/            # header + small directives
  src/styles/_tokens.scss  # design tokens
  proxy.conf.json      # dev /api proxy
  nginx.conf           # prod /api proxy + SPA fallback
docker-compose.yml
AGENTS.md              # conventions for agents working in this repo
```

## Tests

```bash
cd backend && pytest
```

Covers the critical paths: upload → sentence split, sentence labeling
(including idempotency), dashboard search / filter / group, deletion, and the
segmentation rules (offsets, abbreviations, markdown headings).

## Code quality (formatting & linting)

Formatting and linting run automatically on commit via a **Husky pre-commit
hook** (`lint-staged`, on changed files only):

- **Frontend** — [Prettier](https://prettier.io) for formatting and
  [ESLint](https://eslint.org) (`@angular-eslint` + `typescript-eslint`,
  `eslint-config-prettier` so they don't conflict).
- **Backend** — [Ruff](https://docs.astral.sh/ruff/), one fast tool that both
  formats and lints Python.

```bash
# enable the hook + tooling (per clone)
npm install                                   # root: husky + lint-staged
npm install --prefix frontend                 # eslint + prettier
backend/.venv/bin/pip install -r backend/requirements-dev.txt   # ruff

# run manually
npm run lint --prefix frontend                # eslint
npm run format --prefix frontend              # prettier --write
cd backend && .venv/bin/ruff check . && .venv/bin/ruff format .
```

Why both formatter **and** linter: the formatter keeps style consistent and
diffs clean; the linter catches bugs and enforces conventions (the rules in
`AGENTS.md`). See `AGENTS.md` for the project's style rules.

## How I'd extend this

- **Automatic labeling** (the planned pair-programming step): add a
  `POST /documents/{id}/suggest-labels` endpoint that runs each sentence through
  a classifier and returns suggested labels with confidence scores, which the
  user accepts/rejects in the editor. `utils.py` / the annotation flow is the
  seam — start with keyword/regex rules, then an embedding similarity search
  against labeled examples, then an LLM (Claude) with the label taxonomy in the
  prompt for zero-shot suggestions.
- **Better segmentation** — swap the regex splitter for spaCy or a sentence
  transformer to handle legal edge cases (numbered sub-clauses, cross-refs).
- **Scale** — paginate the document list, add full-text search (Postgres
  `tsvector` or OpenSearch) instead of `ILIKE`, and index labels for
  cross-contract clause queries ("show every Non-Compete across all contracts").
- **Productionizing** — Alembic migrations instead of `create_all`, auth +
  multi-tenant workspaces, object storage for original files, and audit history
  on labels.
```
