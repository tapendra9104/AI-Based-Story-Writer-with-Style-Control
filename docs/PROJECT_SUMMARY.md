# AI-Based Story Writer with Style Control

## Project Overview

AI-Based Story Writer with Style Control is a creative writing platform that generates structured stories from user prompts while allowing control over genre, tone, writing style, and pacing. The system is designed as an interactive writing workspace where users can generate a draft, revise it iteratively, compare alternate styles, and manage multiple versions of the same narrative.

The project focuses on combining AI-assisted text generation with a professional dashboard experience. Instead of behaving like a simple prompt-response tool, the platform is structured as a full storytelling environment with a writing editor, story controls, narrative visualizations, and version management.

## Problem Statement

Writing high-quality stories requires creativity, narrative planning, tone consistency, and stylistic control. Many existing text-generation tools can produce text, but they often lack narrative structure, genre consistency, and meaningful user control. This creates difficulty for beginners and limits usefulness for serious creative work.

The project addresses this gap by giving users a system that can:

- generate structured story drafts from short prompts
- adapt output to different literary styles
- support iterative refinement without losing context
- present story development in a visual, editable workspace

## Objectives

- Build a backend service for story generation and refinement
- Allow users to control narrative attributes such as genre, tone, and style
- Provide a professional frontend dashboard for story writing and editing
- Support version tracking and draft management
- Visualize narrative structure, pacing, and character relationships

## Implemented Features

- Prompt-based story generation
- Style-conditioned story creation
- Structured narrative sections:
  - introduction
  - conflict development
  - climax
  - resolution
- Refinement prompts for updating story content
- Version history and draft persistence
- Story library for managing saved work
- Character relationship graph visualization
- Interactive plot timeline editor
- Live style comparison between alternate story variants

## Frontend Design Summary

The frontend follows a professional editorial dashboard theme. The interface is designed to look like a modern writing platform instead of a generic AI generator. The layout is divided into three main areas:

- Sidebar navigation for dashboard sections and story access
- Central writing workspace for prompt entry, editing, and story review
- Right-side control panel for generation settings, refinement actions, and insights

The visual style uses:

- a light neutral background for reduced fatigue
- deep indigo accents for controls and highlights
- muted panel surfaces for structure and contrast
- readable document-focused typography for long-form content

This design improves clarity, workflow efficiency, and presentation quality during project demos and evaluation.

## System Architecture

The application follows a layered design:

```text
User Prompt
    ->
Prompt Processing
    ->
Style Conditioning
    ->
Story Generation Engine
    ->
Post-Processing
    ->
Frontend Dashboard
```

### Backend

- Framework: FastAPI
- Storage: JSON-based persistence
- Core responsibilities:
  - process prompts
  - apply style settings
  - generate stories
  - save versions and story data

### Frontend

- Technologies: HTML, CSS, JavaScript
- Core responsibilities:
  - collect user inputs
  - display generated drafts
  - support editing and refinement
  - visualize story structure and character interactions

## User Workflow

1. The user opens the dashboard and enters a prompt.
2. The user selects genre, tone, writing style, and length.
3. The system generates a structured story draft.
4. The user edits or refines sections through follow-up prompts.
5. The platform stores versions and updates the story library.
6. The user reviews pacing, structure, and style variations using the visualization panels.

## Expected Outcomes

The completed system demonstrates how AI can support creative writing while preserving user control. It enables users to generate coherent stories, experiment with different narrative styles, revise drafts efficiently, and manage their work within a professional interface.

## Future Scope

- Integration with a real large language model
- Multilingual story generation
- Character consistency tracking across versions
- Collaborative writing workflows
- Export to additional formats such as PDF and Markdown

## Conclusion

This project shows how AI-assisted storytelling can move beyond simple text generation into a structured writing platform. By combining controlled generation, iterative editing, and a professional dashboard experience, the system provides a practical and presentation-ready solution for modern creative writing support.
