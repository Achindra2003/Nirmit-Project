CLAUDE.md — Nirmit Project Constitution
This claude.md is nicely curated with your project’s guidelines/information to serve as the absolute source of truth for the CTO (Opus), the Builder (Sonnet), and the Fixer (Haiku).

System Initialization & CLI Workflow
Startup: You can initialize this project environment with /init at the base of your repo. Always ensure this file is read before executing codebase changes.

Context Management: If the context gets too heavy during complex reasoning tasks, export the session and start a fresh one, relying on this file to reset the guardrails.

## 1. The North Star & Core Philosophy
* **READ FIRST:** The complete product manifesto, emotional arc, and design philosophy are locked in `VISION.md`. 
* **Mandate:** You must read `VISION.md` before making any major architectural decisions or generating user-facing text. If your code violates the emotional arc defined in that document, it is a failed build.

2. Cultural & Spatial Sovereignty
Indian Domesticity: The system must inherently understand the texture of Indian life: the importance of the guest's entrance view, the necessity of multi-generational comfort, and the sanctity of prayer spaces.

Vastu as Philosophy: Vastu is not a filter or a toggle; it is a foundational spatial logic that governs the flow and orientation of the home.

Storage as Philosophy: Storage must be treated as a primary architectural challenge, accounting for the accumulation and multi-purpose needs of Indian households.

3. Architectural Separation
The Headless Brain: All intelligence, design logic, spatial math, and cultural inference must be centralized in a Python/LangGraph backend. It must be able to exist and "think" independently of any visual interface.

The Pure Face: The visual interface (React/Three.js) is a window, not an engine. It is responsible for the Ceremony of the reveal and the Clarity of the intent-based editing.

The State Contract: Communication between Brain and Face must be through a robust, predictable JSON contract reflecting the "Room State" and the "Budget Story."

4. Product Principles
Intent-Based Interaction: Users should communicate what they want (Intents), not how to do it. The system handles the technical execution (manipulation).

The Opinionated AI: The AI is a collaborator, not a genie. It must have a point of view, explain its reasoning, and proactively suggest solutions for budget and space.

The "Suresh" Standard: The final output (Quotation) is a product in itself. It is successful only if a local carpenter ("Suresh") can build the design with zero ambiguity using his existing workflows.

5. Absolute Constraints
Spatial Integrity: All dimensions, math, and collision logic must be handled in millimeters (mm) to ensure construction accuracy.

Cost Context: Cost is a psychological tool. It must always be shown in the context of the user's budget and the "Buy vs. Build" value proposition.

Discovery over Search: Users should discover the catalog through the design process, not by browsing a list of items.

6. Legacy Isolation
The Graveyard: The _legacy_poc directory contains old code and assets. Read it to understand previous math, 3D asset dimensions, or catalog structures, but DO NOT replicate its messy, coupled architecture. Extract the intelligence; leave the spaghetti.