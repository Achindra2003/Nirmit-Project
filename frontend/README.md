# Nirmit Frontend — The Pure Face

React + Vite + Three.js (R3F) + Zustand. UI/UX only — no AI calls, no
business logic, no solver, no costing functions. Every intelligent decision
happens in the backend (CLAUDE.md §3).

## Quick start

```powershell
# from frontend/
npm install
npm run dev   # http://localhost:5173 — proxies /api to http://127.0.0.1:8000
```

Run the backend in a second terminal (see `../backend/README.md`).

## Architecture

```
src/
├── routes/      Top-level screens — Intake, Reveal, Planner, Export
├── three/       R3F scene primitives — lighting, materials, item meshes
├── components/  Dumb UI components
├── api/         Typed clients to the 5 backend endpoints + generated types
└── store/       Zustand — holds RoomState; never holds derived intelligence
```

## Hard rules

- Zero imports from `openai`, `@anthropic-ai/sdk`, `groq-sdk`, `langchain`.
  Enforced by ESLint (`.eslintrc.cjs`).
- All dimensions arriving from the backend are millimeters. Convert to
  Three.js meters at the rendering boundary, not in business code.
- Types in `src/api/types.ts` are **generated** from the backend Pydantic
  schemas. Do not hand-edit. See `../shared/contracts/`.
