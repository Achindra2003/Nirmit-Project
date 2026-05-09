# Shared Contracts

JSON Schema is the single source of truth that crosses the Brain/Face boundary.
The schema is **generated from `backend/app/schemas/state.py` (Pydantic)** and
mirrored as TypeScript in `frontend/src/api/types.ts`.

## Generate the schema (once Phase 2 wires this in)

From `backend/`:

```powershell
python -m scripts.export_schema  # writes ../shared/contracts/state.schema.json
```

From `frontend/`:

```powershell
npx json-schema-to-typescript ../shared/contracts/state.schema.json -o src/api/types.ts
```

## Phase 1 status

`frontend/src/api/types.ts` is **hand-written** for Phase 1 because the
generation step isn't wired yet. Treat it as if it were generated — every
change must be made on the Pydantic side first.
