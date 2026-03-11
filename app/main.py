from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.domain import StoryProject
from app.schemas import (
    GenerateStoryRequestPayload,
    ManualSaveRequestPayload,
    RefineStoryRequestPayload,
    StyleComparisonRequestPayload,
    StyleComparisonResponse,
    StoryListItemResponse,
    StoryOptionsResponse,
    StoryProjectResponse,
    StoryVersionResponse,
)
from app.services.story_engine import GENRE_OPTIONS, STYLE_OPTIONS, TONE_OPTIONS, StoryEngine
from app.storage import build_repository


BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
LEGACY_STATIC_DIR = BASE_DIR / "app" / "static"
STATIC_DIR = PUBLIC_DIR / "static" if (PUBLIC_DIR / "static").exists() else LEGACY_STATIC_DIR
INDEX_FILE = PUBLIC_DIR / "index.html" if (PUBLIC_DIR / "index.html").exists() else LEGACY_STATIC_DIR / "index.html"
DATA_FILE = BASE_DIR / "data" / "stories.json"

app = FastAPI(
    title="AI Story Writing Platform",
    description="Interactive story generation workspace with controllable narrative style.",
    version="1.0.0",
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

repository = build_repository(DATA_FILE)
engine = StoryEngine()


def _resolve_base_version(story: StoryProject, requested_version: int | None):
    if requested_version is None:
        return story.current_version

    for version in story.versions:
        if version.version_number == requested_version:
            return version

    raise HTTPException(status_code=404, detail="Base version not found")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/options", response_model=StoryOptionsResponse)
def story_options() -> StoryOptionsResponse:
    return StoryOptionsResponse(
        genres=list(GENRE_OPTIONS),
        tones=list(TONE_OPTIONS),
        writing_styles=list(STYLE_OPTIONS),
    )


@app.get("/api/stories", response_model=list[StoryListItemResponse])
def list_stories() -> list[StoryListItemResponse]:
    return [StoryListItemResponse.from_domain(story) for story in repository.list_stories()]


@app.get("/api/stories/{story_id}", response_model=StoryProjectResponse)
def get_story(story_id: str) -> StoryProjectResponse:
    story = repository.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return StoryProjectResponse.from_domain(story)


@app.get("/api/stories/{story_id}/versions", response_model=list[StoryVersionResponse])
def get_story_versions(story_id: str) -> list[StoryVersionResponse]:
    story = repository.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return [StoryVersionResponse.from_domain(version) for version in story.versions]


@app.post("/api/stories/generate", response_model=StoryProjectResponse)
def generate_story(payload: GenerateStoryRequestPayload) -> StoryProjectResponse:
    request = payload.to_domain()
    title, version = engine.build_initial_version(request)
    project = StoryProject(
        id=str(uuid4()),
        title=title,
        request=request,
        versions=[version],
        active_version=version.version_number,
    )
    repository.save_story(project)
    return StoryProjectResponse.from_domain(project)


@app.post("/api/stories/{story_id}/refine", response_model=StoryProjectResponse)
def refine_story(story_id: str, payload: RefineStoryRequestPayload) -> StoryProjectResponse:
    story = repository.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")

    base_version = _resolve_base_version(story, payload.base_version_number)
    version = engine.refine_version(story.request, base_version, payload.instruction)
    story.add_version(version)
    repository.save_story(story)
    return StoryProjectResponse.from_domain(story)


@app.post("/api/stories/{story_id}/manual-save", response_model=StoryProjectResponse)
def manual_save_story(story_id: str, payload: ManualSaveRequestPayload) -> StoryProjectResponse:
    story = repository.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")

    story.title = payload.title
    base_version = _resolve_base_version(story, payload.base_version_number)
    version = engine.build_manual_version(base_version, payload.to_sections(), payload.note)
    story.add_version(version)
    repository.save_story(story)
    return StoryProjectResponse.from_domain(story)


@app.post("/api/stories/{story_id}/compare-style", response_model=StyleComparisonResponse)
def compare_story_style(story_id: str, payload: StyleComparisonRequestPayload) -> StyleComparisonResponse:
    story = repository.get_story(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")

    comparison_request = story.request.__class__(
        prompt=story.request.prompt,
        genre=payload.genre or story.request.genre,
        tone=payload.tone or story.request.tone,
        writing_style=payload.writing_style or story.request.writing_style,
        story_length=payload.story_length or story.request.story_length,
    )
    title, version = engine.build_initial_version(comparison_request)
    return StyleComparisonResponse(
        title=title,
        prompt=comparison_request.prompt,
        genre=comparison_request.genre,
        tone=comparison_request.tone,
        writing_style=comparison_request.writing_style,
        story_length=comparison_request.story_length,
        version=StoryVersionResponse.from_domain(version),
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(INDEX_FILE)


@app.get("/{full_path:path}")
def spa_fallback(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Route not found")
    return FileResponse(INDEX_FILE)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
