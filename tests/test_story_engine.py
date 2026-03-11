from __future__ import annotations

import unittest
from pathlib import Path
import shutil

from app.domain import StoryProject, StoryRequest, StorySection, StoryVersion
from app.services.story_engine import StoryEngine
from app.storage import StoryRepository


class StoryEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = StoryEngine()
        self.request = StoryRequest(
            prompt="A young explorer discovers an ancient library hidden beneath a desert city.",
            genre="Fantasy",
            tone="Mysterious",
            writing_style="Descriptive",
            story_length=800,
        )

    def test_initial_version_creates_structured_sections(self) -> None:
        title, version = self.engine.build_initial_version(self.request)

        self.assertTrue(title)
        self.assertEqual(version.version_number, 1)
        self.assertEqual([section.id for section in version.sections], [
            "introduction",
            "conflict",
            "climax",
            "resolution",
        ])
        self.assertTrue(all(section.summary for section in version.sections))

    def test_refinement_targets_resolution_for_ending_instruction(self) -> None:
        _, version = self.engine.build_initial_version(self.request)
        refined = self.engine.refine_version(self.request, version, "Make the ending more dramatic.")

        self.assertEqual(refined.version_number, 2)
        self.assertEqual(refined.sections[0].content, version.sections[0].content)
        self.assertIn("greater force", refined.sections[-1].content)
        self.assertNotEqual(refined.sections[-1].content, version.sections[-1].content)

    def test_manual_version_increments_version_number(self) -> None:
        _, version = self.engine.build_initial_version(self.request)
        edited_sections = [
            StorySection(
                id=section.id,
                title=section.title,
                summary=section.summary,
                content=f"{section.content}\n\nEdited by the user.",
            )
            for section in version.sections
        ]

        manual_version = self.engine.build_manual_version(version, edited_sections, "User edit")

        self.assertEqual(manual_version.version_number, 2)
        self.assertEqual(manual_version.note, "User edit")
        self.assertIn("Edited by the user.", manual_version.sections[0].content)


class StoryRepositoryTests(unittest.TestCase):
    def test_repository_round_trip(self) -> None:
        temp_dir = Path("data") / "test-artifacts"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            repository = StoryRepository(temp_dir / "stories.json")
            request = StoryRequest(
                prompt="An inventor loses a machine that can replay forgotten dreams.",
                genre="Science Fiction",
                tone="Hopeful",
                writing_style="Cinematic",
                story_length=700,
            )
            version = StoryVersion(
                version_number=1,
                note="Initial draft",
                sections=[
                    StorySection(
                        id="introduction",
                        title="Introduction",
                        summary="Opening beat",
                        content="Opening beat",
                    )
                ],
            )
            story = StoryProject(id="story-1", title="Dream Replay", request=request, versions=[version])

            repository.save_story(story)
            saved = repository.get_story("story-1")
            listed = repository.list_stories()

            self.assertIsNotNone(saved)
            self.assertEqual(saved.title, "Dream Replay")
            self.assertEqual(len(listed), 1)
            self.assertEqual(listed[0].request.genre, "Science Fiction")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
