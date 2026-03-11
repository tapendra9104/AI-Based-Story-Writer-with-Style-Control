from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(slots=True)
class StoryRequest:
    prompt: str
    genre: str
    tone: str
    writing_style: str
    story_length: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StoryRequest":
        return cls(
            prompt=data["prompt"],
            genre=data["genre"],
            tone=data["tone"],
            writing_style=data["writing_style"],
            story_length=int(data["story_length"]),
        )


@dataclass(slots=True)
class StorySection:
    id: str
    title: str
    summary: str
    content: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StorySection":
        return cls(
            id=data["id"],
            title=data["title"],
            summary=data["summary"],
            content=data["content"],
        )


@dataclass(slots=True)
class StoryVersion:
    version_number: int
    note: str
    sections: list[StorySection]
    created_at: str = field(default_factory=utc_now_iso)

    @property
    def full_text(self) -> str:
        chunks: list[str] = []
        for section in self.sections:
            chunks.append(f"{section.title}\n{section.content}")
        return "\n\n".join(chunks).strip()

    def to_dict(self) -> dict[str, Any]:
        return {
            "version_number": self.version_number,
            "note": self.note,
            "created_at": self.created_at,
            "sections": [section.to_dict() for section in self.sections],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StoryVersion":
        return cls(
            version_number=int(data["version_number"]),
            note=data["note"],
            created_at=data.get("created_at", utc_now_iso()),
            sections=[StorySection.from_dict(section) for section in data["sections"]],
        )


@dataclass(slots=True)
class StoryProject:
    id: str
    title: str
    request: StoryRequest
    versions: list[StoryVersion] = field(default_factory=list)
    active_version: int = 1
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)

    @property
    def current_version(self) -> StoryVersion:
        for version in self.versions:
            if version.version_number == self.active_version:
                return version
        return self.versions[-1]

    def add_version(self, version: StoryVersion) -> None:
        self.versions.append(version)
        self.active_version = version.version_number
        self.updated_at = utc_now_iso()

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "request": self.request.to_dict(),
            "versions": [version.to_dict() for version in self.versions],
            "active_version": self.active_version,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StoryProject":
        return cls(
            id=data["id"],
            title=data["title"],
            request=StoryRequest.from_dict(data["request"]),
            versions=[StoryVersion.from_dict(version) for version in data["versions"]],
            active_version=int(data.get("active_version", 1)),
            created_at=data.get("created_at", utc_now_iso()),
            updated_at=data.get("updated_at", utc_now_iso()),
        )
