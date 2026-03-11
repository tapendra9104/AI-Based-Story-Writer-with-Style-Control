from __future__ import annotations

import json
from pathlib import Path
from threading import RLock

from app.domain import StoryProject


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
            payload = json.loads(self.file_path.read_text(encoding="utf-8"))
        return [StoryProject.from_dict(item) for item in payload.get("stories", [])]

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
