from __future__ import annotations

import json
import os
from pathlib import Path
from threading import RLock

from app.domain import StoryProject


def _load_stories_from_file(file_path: Path) -> list[StoryProject]:
    if not file_path.exists():
        return []

    raw = file_path.read_text(encoding="utf-8").strip()
    if not raw:
        return []

    payload = json.loads(raw)
    return [StoryProject.from_dict(item) for item in payload.get("stories", [])]


class InMemoryStoryRepository:
    def __init__(self, stories: list[StoryProject] | None = None) -> None:
        self._lock = RLock()
        self._stories = list(stories or [])

    def list_stories(self) -> list[StoryProject]:
        with self._lock:
            stories = list(self._stories)
        return sorted(stories, key=lambda story: story.updated_at, reverse=True)

    def get_story(self, story_id: str) -> StoryProject | None:
        with self._lock:
            for story in self._stories:
                if story.id == story_id:
                    return StoryProject.from_dict(story.to_dict())
        return None

    def save_story(self, project: StoryProject) -> StoryProject:
        with self._lock:
            for index, existing in enumerate(self._stories):
                if existing.id == project.id:
                    self._stories[index] = StoryProject.from_dict(project.to_dict())
                    return project

            self._stories.append(StoryProject.from_dict(project.to_dict()))
        return project


class StoryRepository:
    def __init__(self, file_path: Path) -> None:
        self.file_path = file_path
        self._lock = RLock()
        self._ensure_store()

    def _ensure_store(self) -> None:
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists() or not self.file_path.read_text(encoding="utf-8").strip():
            self.file_path.write_text('{"stories": []}', encoding="utf-8")

    def _read_store(self) -> list[StoryProject]:
        with self._lock:
            return _load_stories_from_file(self.file_path)

    def _write_store(self, stories: list[StoryProject]) -> None:
        payload = {"stories": [story.to_dict() for story in stories]}
        with self._lock:
            self.file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def list_stories(self) -> list[StoryProject]:
        stories = self._read_store()
        return sorted(stories, key=lambda story: story.updated_at, reverse=True)

    def get_story(self, story_id: str) -> StoryProject | None:
        for story in self._read_store():
            if story.id == story_id:
                return story
        return None

    def save_story(self, project: StoryProject) -> StoryProject:
        stories = self._read_store()
        for index, existing in enumerate(stories):
            if existing.id == project.id:
                stories[index] = project
                self._write_store(stories)
                return project

        stories.append(project)
        self._write_store(stories)
        return project


def build_repository(file_path: Path) -> StoryRepository | InMemoryStoryRepository:
    storage_mode = os.getenv("STORY_STORAGE_MODE", "").strip().lower()
    seeded_stories = _load_stories_from_file(file_path)

    if storage_mode == "memory":
        return InMemoryStoryRepository(seeded_stories)

    if storage_mode == "file":
        return StoryRepository(file_path)

    if os.getenv("VERCEL"):
        return InMemoryStoryRepository(seeded_stories)

    try:
        return StoryRepository(file_path)
    except OSError:
        return InMemoryStoryRepository(seeded_stories)
