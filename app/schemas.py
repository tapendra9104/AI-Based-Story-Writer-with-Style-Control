from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain import StoryProject, StoryRequest, StorySection, StoryVersion


class StorySectionPayload(BaseModel):
    id: str
    title: str
    summary: str | None = None
    content: str = Field(min_length=1)


class GenerateStoryRequestPayload(BaseModel):
    prompt: str = Field(min_length=8, max_length=1000)
    genre: str
    tone: str
    writing_style: str
    story_length: int = Field(ge=300, le=1800)

    def to_domain(self) -> StoryRequest:
        return StoryRequest(
            prompt=self.prompt,
            genre=self.genre,
            tone=self.tone,
            writing_style=self.writing_style,
            story_length=self.story_length,
        )


class RefineStoryRequestPayload(BaseModel):
    instruction: str = Field(min_length=3, max_length=500)
    base_version_number: int | None = Field(default=None, ge=1)


class ManualSaveRequestPayload(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    note: str = Field(default="Manual edit", max_length=200)
    base_version_number: int | None = Field(default=None, ge=1)
    sections: list[StorySectionPayload] = Field(min_length=1)

    def to_sections(self) -> list[StorySection]:
        return [
            StorySection(
                id=section.id,
                title=section.title,
                summary=section.summary or "",
                content=section.content,
            )
            for section in self.sections
        ]


class StorySectionResponse(BaseModel):
    id: str
    title: str
    summary: str
    content: str

    @classmethod
    def from_domain(cls, section: StorySection) -> "StorySectionResponse":
        return cls(
            id=section.id,
            title=section.title,
            summary=section.summary,
            content=section.content,
        )


class StoryVersionResponse(BaseModel):
    version_number: int
    note: str
    created_at: str
    full_text: str
    sections: list[StorySectionResponse]

    @classmethod
    def from_domain(cls, version: StoryVersion) -> "StoryVersionResponse":
        return cls(
            version_number=version.version_number,
            note=version.note,
            created_at=version.created_at,
            full_text=version.full_text,
            sections=[StorySectionResponse.from_domain(section) for section in version.sections],
        )


class StoryListItemResponse(BaseModel):
    id: str
    title: str
    prompt: str
    genre: str
    tone: str
    writing_style: str
    story_length: int
    updated_at: str
    version_count: int

    @classmethod
    def from_domain(cls, project: StoryProject) -> "StoryListItemResponse":
        return cls(
            id=project.id,
            title=project.title,
            prompt=project.request.prompt,
            genre=project.request.genre,
            tone=project.request.tone,
            writing_style=project.request.writing_style,
            story_length=project.request.story_length,
            updated_at=project.updated_at,
            version_count=len(project.versions),
        )


class StoryProjectResponse(BaseModel):
    id: str
    title: str
    prompt: str
    genre: str
    tone: str
    writing_style: str
    story_length: int
    created_at: str
    updated_at: str
    active_version: int
    versions: list[StoryVersionResponse]

    @classmethod
    def from_domain(cls, project: StoryProject) -> "StoryProjectResponse":
        return cls(
            id=project.id,
            title=project.title,
            prompt=project.request.prompt,
            genre=project.request.genre,
            tone=project.request.tone,
            writing_style=project.request.writing_style,
            story_length=project.request.story_length,
            created_at=project.created_at,
            updated_at=project.updated_at,
            active_version=project.active_version,
            versions=[StoryVersionResponse.from_domain(version) for version in project.versions],
        )


class StoryOptionsResponse(BaseModel):
    genres: list[str]
    tones: list[str]
    writing_styles: list[str]


class StyleComparisonRequestPayload(BaseModel):
    genre: str | None = None
    tone: str | None = None
    writing_style: str | None = None
    story_length: int | None = Field(default=None, ge=300, le=1800)


class StyleComparisonResponse(BaseModel):
    title: str
    prompt: str
    genre: str
    tone: str
    writing_style: str
    story_length: int
    version: StoryVersionResponse
