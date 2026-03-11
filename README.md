# Story Foundry

Story Foundry is a full-stack MVP for an AI-assisted story writing platform with controllable narrative style. It generates structured four-part stories, supports iterative refinement prompts, keeps version history, and provides a browser-based editing workspace.

## What is implemented

- Prompt-driven story generation with genre, tone, writing style, and target length controls
- Structured output split into introduction, conflict development, climax, and resolution
- Iterative refinement that creates a new version from the currently viewed draft
- Manual editing with version notes and persistent history
- Story timeline view and story library
- JSON-backed persistence so drafts survive restarts

## Frontend dashboard theme

The interface is designed as a professional editorial dashboard rather than a generic AI generation page. The frontend uses a three-zone workflow:

- a fixed navigation sidebar for modules and session context
- a central writing workspace for prompt creation, story editing, plot pacing, and live style comparison
- a right-side control rail for generation settings, revision prompts, AI suggestions, character mapping, and version history

The visual system uses a light editorial palette with soft neutrals, deep indigo accents, table-based story management, and document-first typography. The goal is to resemble a modern writing product where clarity, control, and workflow efficiency matter more than visual spectacle.

Advanced frontend panels now include:

- character relationship graph visualization derived from the current draft
- interactive plot timeline controls for pacing adjustments
- live style comparison previews generated from alternate genre, tone, and writing-style settings

## Stack

- Backend: FastAPI
- Frontend: static single-page app served by FastAPI
- Storage: local JSON file at `data/stories.json`
- Narrative engine: offline heuristic generator designed to be replaceable with an LLM provider later

## Project layout

```text
app/
  main.py
  domain.py
  schemas.py
  storage.py
  services/story_engine.py
  static/
    index.html
    styles.css
    app.js
data/
  stories.json
tests/
  test_story_engine.py
```

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the app:

```bash
uvicorn app.main:app --reload
```

4. Open `http://127.0.0.1:8000`

## Notes

- The current generator is offline and deterministic. It gives the project a working end-to-end narrative pipeline without requiring external APIs.
- If you want real model-backed generation later, the clean extension point is [`app/services/story_engine.py`](/c:/AI-Based%20Story%20Writer%20with%20Style%20Control/app/services/story_engine.py).
