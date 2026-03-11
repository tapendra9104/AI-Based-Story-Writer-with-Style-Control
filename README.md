# Story Foundry

Story Foundry is an AI-based story writing platform that helps users generate, edit, and refine structured narratives while controlling genre, tone, writing style, and pacing. The project combines a FastAPI backend with a professional editorial dashboard designed to feel like a real creative writing workspace rather than a simple text generator.

## Overview

The platform is built for writers, students, and content creators who want more control than a generic prompt-to-text tool provides. Instead of producing flat output, Story Foundry organizes each draft into a narrative structure, supports iterative revision, preserves version history, and exposes visual tools for understanding how the story evolves.

## Core Features

- Prompt-based story generation with configurable genre, tone, writing style, and target length
- Structured narrative output across introduction, conflict development, climax, and resolution
- Iterative refinement prompts for revising specific parts of a draft
- Story version management with editable saved revisions
- Professional editorial dashboard with a focused writing workspace
- Story library for reopening and managing saved drafts
- Download support for generated stories

## Advanced Frontend Features

- Character relationship graph visualization based on the active story draft
- Interactive plot timeline editor for pacing and narrative flow review
- Live style comparison panel for previewing alternate genre, tone, and style combinations
- AI suggestion panel for revision ideas and narrative improvements

## Frontend Dashboard Theme

The interface follows a clean editorial dashboard style inspired by modern writing tools. The layout is organized into three functional zones:

- Left sidebar for navigation, story modules, and session context
- Central workspace for prompt creation, editing, structure review, and comparison
- Right control rail for story settings, refinement prompts, suggestions, and version history

The visual design uses a light neutral background, muted panel surfaces, deep indigo accents, readable typography, and table-based content presentation. The result is a professional product-facing UI intended to look credible in demos, reports, and project evaluations.

## Tech Stack

- Backend: FastAPI
- Frontend: HTML, CSS, and JavaScript served by FastAPI
- Storage: local JSON persistence in `data/stories.json`
- Narrative engine: offline deterministic generator designed to be replaced by a real LLM later
- Testing: Python `unittest`

## API Highlights

- `POST /api/stories/generate` - generate a new story draft
- `POST /api/stories/{story_id}/refine` - revise a story with follow-up instructions
- `POST /api/stories/{story_id}/versions` - save a manual version
- `POST /api/stories/{story_id}/compare-style` - preview alternate style variants
- `GET /api/stories` - list saved stories
- `GET /api/stories/{story_id}` - fetch a single story and its versions

## Project Structure

```text
app/
  main.py
  domain.py
  schemas.py
  storage.py
  services/
    story_engine.py
  static/
    index.html
    styles.css
    app.js
data/
  stories.json
tests/
  test_story_engine.py
requirements.txt
README.md
```

## Run Locally

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the development server:

```bash
uvicorn app.main:app --reload
```

4. Open the app in your browser:

```text
http://127.0.0.1:8000
```

## Current Implementation Notes

- The current story engine is intentionally offline and deterministic, so the project runs end-to-end without external API keys.
- The main extension point for integrating a real model provider is `app/services/story_engine.py`.
- Story data is stored locally in `data/stories.json`.

## Future Enhancements

- Real LLM-backed story generation
- Character consistency tracking across versions
- Collaborative editing workflows
- Multilingual storytelling support
- Export formats such as PDF and Markdown

## Repository Description

AI-powered story writing platform with controllable genre, tone, and narrative style, featuring a professional editorial dashboard, version history, plot pacing tools, character relationship mapping, and live style comparison.

## Suggested GitHub Topics

`fastapi` `ai-writing` `story-generation` `creative-writing` `nlp` `dashboard` `javascript` `frontend` `python` `editor`
