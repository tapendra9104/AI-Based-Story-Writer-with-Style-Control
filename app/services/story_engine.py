from __future__ import annotations

import hashlib
import random
import re
from dataclasses import replace

from app.domain import StoryRequest, StorySection, StoryVersion


SECTION_ORDER: tuple[tuple[str, str], ...] = (
    ("introduction", "Introduction"),
    ("conflict", "Conflict Development"),
    ("climax", "Climax"),
    ("resolution", "Resolution"),
)

GENRE_OPTIONS = (
    "Fantasy",
    "Mystery",
    "Science Fiction",
    "Romance",
    "Adventure",
    "Horror",
)

TONE_OPTIONS = (
    "Mysterious",
    "Suspenseful",
    "Dark",
    "Hopeful",
    "Whimsical",
    "Melancholic",
)

STYLE_OPTIONS = (
    "Descriptive",
    "Minimalist",
    "Cinematic",
    "Poetic",
    "Conversational",
)

STOPWORDS = {
    "a",
    "an",
    "ancient",
    "and",
    "as",
    "at",
    "beneath",
    "by",
    "discovers",
    "every",
    "finds",
    "for",
    "from",
    "hidden",
    "in",
    "into",
    "itself",
    "of",
    "on",
    "that",
    "the",
    "to",
    "with",
    "young",
}

GENRE_DETAILS = {
    "Fantasy": {
        "setting": [
            "a kingdom where stone remembers forgotten vows",
            "a city threaded with lantern smoke and half-buried temples",
            "a frontier where old magic survives in the bones of the land",
        ],
        "artifact": ["a runed relic", "an impossible map", "a sleeping archive"],
        "opposition": ["an oath-bound guardian", "a court of veiled powers", "a prophecy that resists being read"],
        "stakes": ["the boundary between legend and history", "the fragile peace holding the realm together", "the memory of an entire people"],
        "resolution": ["wonder survives, but it asks to be protected rather than possessed", "the victory rewrites what the world believes is possible", "the ending leaves myth standing close beside ordinary life"],
    },
    "Mystery": {
        "setting": [
            "a district that keeps its windows dark after midnight",
            "a city of clipped conversations and locked filing drawers",
            "a neighborhood where everyone knows more than they admit",
        ],
        "artifact": ["a missing file", "a damaged photograph", "an unsigned confession"],
        "opposition": ["a careful liar", "a chain of alibis that fits too neatly", "a witness whose silence is strategic"],
        "stakes": ["the truth that links the case to old harm", "the reputation of someone already under suspicion", "the thin line between justice and exposure"],
        "resolution": ["the final answer lands, but not every bruise disappears with it", "the truth restores order while leaving one last unease behind", "closure arrives together with a hint that someone still profited from the silence"],
    },
    "Science Fiction": {
        "setting": [
            "a habitat tuned by algorithms and failing light",
            "a colony where every system speaks in predictive probabilities",
            "an orbital city balanced between progress and collapse",
        ],
        "artifact": ["a prohibited signal", "a prototype interface", "a fragment of impossible code"],
        "opposition": ["a system that edits memory for efficiency", "a rival intelligence", "a command structure that prefers obedience to discovery"],
        "stakes": ["the autonomy of the people inside the network", "the future design of human life", "whether knowledge remains free to circulate"],
        "resolution": ["the breakthrough changes the map of tomorrow", "the escape succeeds, though the new horizon remains unstable", "progress survives only because someone chose conscience over control"],
    },
    "Romance": {
        "setting": [
            "a city that turns ordinary streets into private stages",
            "a place where old routines leave just enough room for surprise",
            "a season that makes every conversation feel slightly more consequential",
        ],
        "artifact": ["an unsent letter", "a shared song", "a keepsake nobody intended to keep"],
        "opposition": ["fear of being known too clearly", "a badly timed obligation", "the distance created by prior hurt"],
        "stakes": ["whether vulnerability becomes a bridge or a wound", "the chance to build something that lasts beyond first intensity", "the courage required to choose honesty over safety"],
        "resolution": ["the ending favors intimacy earned through risk", "the final exchange makes room for a future both people can inhabit", "the story closes on affection that feels chosen rather than accidental"],
    },
    "Adventure": {
        "setting": [
            "a landscape that rewards courage and punishes carelessness",
            "a route cut through weather, rumor, and shifting alliances",
            "a world that keeps opening further the more it is challenged",
        ],
        "artifact": ["a lost chart", "a hidden key", "a device designed for one impossible journey"],
        "opposition": ["a ruthless competitor", "terrain that refuses easy passage", "a bargain that turns help into leverage"],
        "stakes": ["who gets to define the destination", "whether discovery becomes liberation or conquest", "the survival of the team bound to the quest"],
        "resolution": ["the ending makes the journey feel larger than the prize", "survival and discovery arrive in the same breath", "the return home proves as meaningful as the victory itself"],
    },
    "Horror": {
        "setting": [
            "a place where silence behaves like a living thing",
            "a structure that should have been abandoned long ago",
            "a landscape that grows stranger the longer it is observed",
        ],
        "artifact": ["a forbidden recording", "a marked object", "an inherited secret"],
        "opposition": ["a presence that studies people before it strikes", "an entity attached to memory itself", "the realization that the danger was invited in"],
        "stakes": ["who remains themselves by the end", "whether the truth can be faced without becoming contagious", "how much of the past must be carried forward"],
        "resolution": ["survival comes with a visible cost", "the final quiet feels temporary rather than safe", "the story closes after the danger withdraws but before it is truly gone"],
    },
}

TONE_DETAILS = {
    "Mysterious": {
        "atmosphere": "answers arrive disguised as echoes",
        "pressure": "each revelation seems to deepen the shadow around it",
        "release": "certainty stays partially out of reach",
    },
    "Suspenseful": {
        "atmosphere": "every pause feels like a countdown",
        "pressure": "small mistakes carry immediate consequences",
        "release": "the aftermath still vibrates with danger",
    },
    "Dark": {
        "atmosphere": "hope exists, but only under strain",
        "pressure": "every choice demands a visible cost",
        "release": "survival is not the same thing as innocence",
    },
    "Hopeful": {
        "atmosphere": "possibility remains present even under pressure",
        "pressure": "setbacks sharpen resolve instead of extinguishing it",
        "release": "the ending leaves room for growth and repair",
    },
    "Whimsical": {
        "atmosphere": "surprise and delight keep interrupting certainty",
        "pressure": "obstacles bend toward cleverness more often than despair",
        "release": "the ending feels lightly magical without losing emotional weight",
    },
    "Melancholic": {
        "atmosphere": "beauty is inseparable from what may be lost",
        "pressure": "progress carries the ache of change",
        "release": "the ending comforts without pretending nothing has ended",
    },
}

STYLE_DETAILS = {
    "Descriptive": {
        "voice": "sensory detail lingers on texture, temperature, and sound",
        "cadence": "sentences gather slowly before landing on a vivid image",
    },
    "Minimalist": {
        "voice": "details are spare and chosen for impact",
        "cadence": "the prose moves in clean, direct beats",
    },
    "Cinematic": {
        "voice": "the scene is framed through movement, contrast, and visual scale",
        "cadence": "moments cut sharply from stillness to action",
    },
    "Poetic": {
        "voice": "images echo one another and carry emotional subtext",
        "cadence": "the prose favors rhythm and metaphor over blunt exposition",
    },
    "Conversational": {
        "voice": "the narration feels close, warm, and immediately readable",
        "cadence": "the prose uses clear phrasing that keeps momentum high",
    },
}

SECTION_HINTS = {
    "introduction": ("opening", "beginning", "intro", "hook", "first scene"),
    "conflict": ("middle", "conflict", "tension", "twist", "obstacle"),
    "climax": ("climax", "battle", "confrontation", "peak", "showdown"),
    "resolution": ("ending", "final", "resolution", "last scene", "conclusion"),
}


class StoryEngine:
    def build_initial_version(self, request: StoryRequest) -> tuple[str, StoryVersion]:
        normalized = self._normalize_request(request)
        title = self._suggest_title(normalized)
        sections = self._build_sections(normalized)
        version = StoryVersion(version_number=1, note="Initial draft", sections=sections)
        return title, version

    def refine_version(
        self,
        request: StoryRequest,
        previous_version: StoryVersion,
        instruction: str,
    ) -> StoryVersion:
        target = self._target_section(instruction)
        refined_sections: list[StorySection] = []

        for section in previous_version.sections:
            if target and section.id != target:
                refined_sections.append(replace(section))
                continue

            extension = self._build_refinement_extension(section.id, request, instruction)
            updated = section.content.strip()
            if extension:
                updated = f"{updated}\n\n{extension}".strip()

            refined_sections.append(
                StorySection(
                    id=section.id,
                    title=section.title,
                    summary=self.summarize_section(updated),
                    content=updated,
                )
            )

        version_number = previous_version.version_number + 1
        note = instruction.strip() or "Refined draft"
        return StoryVersion(version_number=version_number, note=note, sections=refined_sections)

    def build_manual_version(
        self,
        previous_version: StoryVersion,
        sections: list[StorySection],
        note: str,
    ) -> StoryVersion:
        version_number = previous_version.version_number + 1
        normalized_sections = [
            StorySection(
                id=section.id,
                title=section.title,
                summary=self.summarize_section(section.content),
                content=section.content.strip(),
            )
            for section in sections
        ]
        return StoryVersion(
            version_number=version_number,
            note=note.strip() or "Manual edit",
            sections=normalized_sections,
        )

    def summarize_section(self, content: str) -> str:
        flattened = re.sub(r"\s+", " ", content.strip())
        words = flattened.split()
        if len(words) <= 20:
            return flattened
        return " ".join(words[:20]).rstrip(",.;:") + "..."

    def _normalize_request(self, request: StoryRequest) -> StoryRequest:
        return StoryRequest(
            prompt=request.prompt.strip(),
            genre=request.genre.strip() or "Fantasy",
            tone=request.tone.strip() or "Mysterious",
            writing_style=request.writing_style.strip() or "Descriptive",
            story_length=max(300, min(1800, int(request.story_length))),
        )

    def _build_sections(self, request: StoryRequest) -> list[StorySection]:
        sections: list[StorySection] = []
        for section_id, title in SECTION_ORDER:
            content = self._compose_section(section_id, request)
            sections.append(
                StorySection(
                    id=section_id,
                    title=title,
                    summary=self.summarize_section(content),
                    content=content,
                )
            )
        return sections

    def _compose_section(self, section_id: str, request: StoryRequest) -> str:
        details = GENRE_DETAILS[request.genre]
        tone = TONE_DETAILS[request.tone]
        style = STYLE_DETAILS[request.writing_style]
        rng = self._rng(request, section_id)
        prompt_sentence = self._ensure_sentence(request.prompt)
        lower_prompt = self._lowercase_first(prompt_sentence.rstrip("."))

        setting = rng.choice(details["setting"])
        artifact = rng.choice(details["artifact"])
        opposition = rng.choice(details["opposition"])
        stakes = rng.choice(details["stakes"])
        resolution = rng.choice(details["resolution"])

        paragraphs: list[str]
        if section_id == "introduction":
            paragraphs = [
                (
                    f"{prompt_sentence} The story opens in {setting}, where {tone['atmosphere']}. "
                    f"{style['voice'].capitalize()}, giving the opening a clear sense of place and intent."
                ),
                (
                    f"What first appears to be a single discovery quickly reveals the pull of {artifact}. "
                    f"The central figure senses that this moment touches {stakes}, and that nothing ahead will remain simple."
                ),
            ]
        elif section_id == "conflict":
            paragraphs = [
                (
                    f"As the discovery settles into consequence, the path forward runs into {opposition}. "
                    f"{tone['pressure'].capitalize()}, forcing the protagonist to weigh curiosity against risk."
                ),
                (
                    f"Clues, setbacks, and uneasy alliances push the narrative outward from the original prompt: {lower_prompt}. "
                    f"{style['cadence'].capitalize()}, so each turn feels tied to the last rather than randomly imposed."
                ),
            ]
        elif section_id == "climax":
            paragraphs = [
                (
                    f"The climax arrives when retreat is no longer possible. Faced with {opposition} and the threat hanging over {stakes}, "
                    f"the protagonist has to decide what kind of person the journey has made them."
                ),
                (
                    f"The decisive act turns the meaning of {artifact} inside out, delivering a scene that feels earned by the mounting pressure. "
                    f"The choice is immediate, public, and irreversible."
                ),
            ]
        else:
            paragraphs = [
                (
                    f"After the turning point, the consequences move through the world in quieter waves. "
                    f"{tone['release'].capitalize()}, and the story pays attention to what the characters now understand differently."
                ),
                (
                    f"{resolution.capitalize()}. The closing image echoes the prompt once more, proving that {lower_prompt} was never only an event, "
                    f"but the beginning of a deeper transformation."
                ),
            ]

        if request.story_length >= 900:
            paragraphs.append(self._expansion_sentence(section_id, request, rng, details, tone, style))
        if request.story_length >= 1300:
            paragraphs.append(self._expansion_sentence(section_id, request, rng, details, tone, style))

        return "\n\n".join(paragraphs).strip()

    def _expansion_sentence(
        self,
        section_id: str,
        request: StoryRequest,
        rng: random.Random,
        details: dict[str, list[str]],
        tone: dict[str, str],
        style: dict[str, str],
    ) -> str:
        artifact = rng.choice(details["artifact"])
        opposition = rng.choice(details["opposition"])
        stakes = rng.choice(details["stakes"])

        extras = {
            "introduction": (
                f"Even before the plot fully declares itself, the atmosphere suggests the world has been keeping secrets longer than anyone expected."
            ),
            "conflict": (
                f"Secondary characters add pressure by treating {artifact} as leverage, while the environment itself seems aligned with {opposition}."
            ),
            "climax": (
                f"The scene plays with maximum urgency, pairing {style['voice']} against the knowledge that failure would reshape {stakes} for the worse."
            ),
            "resolution": (
                f"The final note lingers on {tone['release']}, leaving the audience with a sense that the cost of the journey has meaning rather than spectacle."
            ),
        }
        return extras[section_id]

    def _build_refinement_extension(self, section_id: str, request: StoryRequest, instruction: str) -> str:
        normalized = instruction.lower().strip()
        details = GENRE_DETAILS[request.genre]
        tone = TONE_DETAILS[request.tone]
        style = STYLE_DETAILS[request.writing_style]
        rng = self._rng(request, normalized or section_id)
        stakes = rng.choice(details["stakes"])
        artifact = rng.choice(details["artifact"])
        opposition = rng.choice(details["opposition"])

        beats: list[str] = []
        if "dramatic" in normalized:
            beats.append(
                f"The moment lands with greater force, making the consequences visible to everyone attached to {stakes}."
            )
        if "dark" in normalized or "darker" in normalized:
            beats.append(
                "A sharper cost surfaces, suggesting that victory and damage may have arrived together."
            )
        if "hopeful" in normalized:
            beats.append(
                "Even under pressure, the scene preserves a credible opening toward repair rather than collapse."
            )
        if "mysterious" in normalized:
            beats.append(
                f"One crucial detail connected to {artifact} remains deliberately veiled, allowing uncertainty to keep its grip."
            )
        if "twist" in normalized:
            beats.append(
                f"A late revelation reframes the role of {opposition}, changing the emotional angle of what came before."
            )
        if "descriptive" in normalized:
            beats.append(
                f"The prose slows long enough to notice sound, texture, and movement, in keeping with a {request.writing_style.lower()} voice."
            )
        if "shorter" in normalized or "concise" in normalized:
            beats.append("The revised beat trims away hesitation and focuses only on the emotional hinge of the moment.")
        if "ending" in normalized and section_id == "resolution":
            beats.append(
                f"The closing image circles back to the original premise while making the emotional cost of {stakes} unmistakable."
            )
        if not beats:
            defaults = {
                "introduction": f"The opening gains a cleaner hook by linking the first image to {style['cadence']} and immediate curiosity.",
                "conflict": f"The middle tightens around {opposition}, ensuring the tension escalates rather than wandering.",
                "climax": f"The confrontation sharpens until the decision around {artifact} feels unavoidable.",
                "resolution": f"The aftermath rests on {tone['release']}, giving the ending a more resonant final beat.",
            }
            beats.append(defaults[section_id])

        return " ".join(beats)

    def _suggest_title(self, request: StoryRequest) -> str:
        keywords = self._keywords(request.prompt)
        details = GENRE_DETAILS[request.genre]
        rng = self._rng(request, "title")

        focal = keywords[1] if len(keywords) > 1 else (keywords[0] if keywords else rng.choice(["Echo", "Archive", "Promise"]))
        secondary = keywords[2] if len(keywords) > 2 else rng.choice(
            [word.split()[-1].title() for word in details["artifact"]]
        )
        templates = (
            f"The {focal}",
            f"{focal} and the {secondary}",
            f"The Secret of the {focal}",
            f"Where {focal} Waits",
        )
        return rng.choice(templates)

    def _keywords(self, prompt: str) -> list[str]:
        tokens = re.findall(r"[A-Za-z']+", prompt)
        keywords = [
            token.title()
            for token in tokens
            if len(token) > 2 and token.lower() not in STOPWORDS
        ]
        deduped: list[str] = []
        for keyword in keywords:
            if keyword not in deduped:
                deduped.append(keyword)
        return deduped[:4]

    def _target_section(self, instruction: str) -> str | None:
        normalized = instruction.lower()
        for section_id, hints in SECTION_HINTS.items():
            if any(hint in normalized for hint in hints):
                return section_id
        return None

    def _rng(self, request: StoryRequest, salt: str) -> random.Random:
        fingerprint = "|".join(
            [
                request.prompt.strip().lower(),
                request.genre,
                request.tone,
                request.writing_style,
                str(request.story_length),
                salt,
            ]
        )
        seed = int(hashlib.sha256(fingerprint.encode("utf-8")).hexdigest(), 16)
        return random.Random(seed)

    def _ensure_sentence(self, text: str) -> str:
        cleaned = re.sub(r"\s+", " ", text.strip())
        if not cleaned:
            return "A story begins."
        if cleaned[-1] not in ".!?":
            cleaned += "."
        return cleaned[0].upper() + cleaned[1:]

    def _lowercase_first(self, text: str) -> str:
        if not text:
            return text
        return text[0].lower() + text[1:]
