const state = {
  options: null,
  stories: [],
  activeStory: null,
  selectedVersionNumber: null,
  comparePreview: null,
  comparePreviewStoryId: null,
  focusCharacter: null,
  timelineDraft: {},
  timelineKey: null,
  busy: false,
};

const elements = {};

const ROLE_SEEDS = {
  Fantasy: ["Explorer", "Archivist", "Guardian", "Queen", "Seer"],
  Mystery: ["Detective", "Witness", "Archivist", "Suspect", "Inspector"],
  "Science Fiction": ["Pilot", "Scientist", "Navigator", "Commander", "Analyst"],
  Romance: ["Writer", "Composer", "Partner", "Friend", "Confidant"],
  Adventure: ["Captain", "Guide", "Scout", "Rival", "Keeper"],
  Horror: ["Caretaker", "Witness", "Stranger", "Guardian", "Survivor"],
};

const ROLE_WORDS = [
  "protagonist",
  "guardian",
  "archivist",
  "queen",
  "detective",
  "explorer",
  "witness",
  "inventor",
  "captain",
  "advisor",
  "rival",
  "ally",
  "keeper",
  "stranger",
  "survivor",
  "scientist",
  "commander",
  "pilot",
];

const NAME_IGNORE = new Set([
  "Introduction",
  "Conflict",
  "Development",
  "Climax",
  "Resolution",
  "The",
  "This",
  "That",
  "What",
  "After",
  "Even",
  "When",
  "Story",
  "Current",
  "Version",
]);

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  bootstrap().catch(handleError);
});

function cacheElements() {
  elements.statusMessage = document.getElementById("statusMessage");
  elements.promptForm = document.getElementById("promptForm");
  elements.storyPrompt = document.getElementById("storyPrompt");
  elements.genreSelect = document.getElementById("genreSelect");
  elements.toneSelect = document.getElementById("toneSelect");
  elements.styleSelect = document.getElementById("styleSelect");
  elements.lengthInput = document.getElementById("lengthInput");
  elements.generateButton = document.getElementById("generateButton");
  elements.storyTitle = document.getElementById("storyTitle");
  elements.storyMeta = document.getElementById("storyMeta");
  elements.saveNote = document.getElementById("saveNote");
  elements.saveButton = document.getElementById("saveButton");
  elements.downloadButton = document.getElementById("downloadButton");
  elements.emptyWorkspace = document.getElementById("emptyWorkspace");
  elements.sectionsContainer = document.getElementById("sectionsContainer");
  elements.refineInstruction = document.getElementById("refineInstruction");
  elements.refineButton = document.getElementById("refineButton");
  elements.versionsContainer = document.getElementById("versionsContainer");
  elements.libraryTableBody = document.getElementById("libraryTableBody");
  elements.structureBarsContainer = document.getElementById("structureBarsContainer");
  elements.timelineControlsContainer = document.getElementById("timelineControlsContainer");
  elements.timelineSummary = document.getElementById("timelineSummary");
  elements.applyTimelineButton = document.getElementById("applyTimelineButton");
  elements.suggestionsContainer = document.getElementById("suggestionsContainer");
  elements.characterGraphSummary = document.getElementById("characterGraphSummary");
  elements.characterGraph = document.getElementById("characterGraph");
  elements.characterDetail = document.getElementById("characterDetail");
  elements.compareGenreSelect = document.getElementById("compareGenreSelect");
  elements.compareToneSelect = document.getElementById("compareToneSelect");
  elements.compareStyleSelect = document.getElementById("compareStyleSelect");
  elements.compareButton = document.getElementById("compareButton");
  elements.comparisonCurrentTitle = document.getElementById("comparisonCurrentTitle");
  elements.comparisonCurrentMeta = document.getElementById("comparisonCurrentMeta");
  elements.comparisonCurrentPane = document.getElementById("comparisonCurrentPane");
  elements.comparisonPreviewTitle = document.getElementById("comparisonPreviewTitle");
  elements.comparisonPreviewMeta = document.getElementById("comparisonPreviewMeta");
  elements.comparisonPreviewPane = document.getElementById("comparisonPreviewPane");
  elements.comparisonInsights = document.getElementById("comparisonInsights");
  elements.metricVersion = document.getElementById("metricVersion");
  elements.metricWords = document.getElementById("metricWords");
  elements.metricCharacters = document.getElementById("metricCharacters");
  elements.metricStories = document.getElementById("metricStories");
  elements.navStorySummary = document.getElementById("navStorySummary");
  elements.newStoryShortcut = document.getElementById("newStoryShortcut");
  elements.navLinks = Array.from(document.querySelectorAll(".nav-link"));
}

function bindEvents() {
  elements.promptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    generateStory().catch(handleError);
  });
  elements.refineButton.addEventListener("click", () => {
    refineStory().catch(handleError);
  });
  elements.saveButton.addEventListener("click", () => {
    saveManualVersion().catch(handleError);
  });
  elements.downloadButton.addEventListener("click", downloadCurrentStory);
  elements.compareButton.addEventListener("click", () => {
    generateComparisonPreview().catch(handleError);
  });
  elements.applyTimelineButton.addEventListener("click", applyTimelineInstruction);
  elements.newStoryShortcut.addEventListener("click", () => {
    scrollToSection("newStorySection");
    elements.storyPrompt.focus();
  });
  elements.navLinks.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveNav(button.dataset.target);
      scrollToSection(button.dataset.target);
    });
  });
}

async function bootstrap() {
  updateBusy(true);
  updateStatus("Loading workspace...");
  const [options, stories] = await Promise.all([api("/api/options"), api("/api/stories")]);
  state.options = options;
  state.stories = stories;
  applyOptions();
  renderLibrary();
  if (stories.length > 0) {
    await loadStory(stories[0].id);
  } else {
    renderStory(null);
  }
  updateBusy(false);
  updateStatus("Workspace ready.");
}

async function generateStory() {
  const payload = {
    prompt: elements.storyPrompt.value.trim(),
    genre: elements.genreSelect.value,
    tone: elements.toneSelect.value,
    writing_style: elements.styleSelect.value,
    story_length: Number(elements.lengthInput.value),
  };
  if (payload.prompt.length < 8) {
    updateStatus("Enter a more detailed story prompt before generating.", true);
    elements.storyPrompt.focus();
    return;
  }
  updateBusy(true);
  updateStatus("Generating story draft...");
  const story = await api("/api/stories/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  state.activeStory = story;
  state.selectedVersionNumber = story.active_version;
  resetDerivedState();
  seedComparisonSelectors(story);
  await refreshLibrary();
  renderStory(story);
  updateBusy(false);
  updateStatus("Story draft generated.");
}

async function refineStory() {
  if (!state.activeStory) {
    updateStatus("Generate or open a story before refining it.", true);
    return;
  }
  const instruction = elements.refineInstruction.value.trim();
  if (!instruction) {
    updateStatus("Add a revision brief before refining.", true);
    return;
  }
  updateBusy(true);
  updateStatus("Refining current version...");
  const story = await api(`/api/stories/${state.activeStory.id}/refine`, {
    method: "POST",
    body: JSON.stringify({
      instruction,
      base_version_number: state.selectedVersionNumber,
    }),
  });
  state.activeStory = story;
  state.selectedVersionNumber = story.active_version;
  elements.refineInstruction.value = "";
  resetDerivedState();
  seedComparisonSelectors(story);
  await refreshLibrary();
  renderStory(story);
  updateBusy(false);
  updateStatus("Refined version created.");
}

async function saveManualVersion() {
  if (!state.activeStory) {
    updateStatus("Nothing to save yet.", true);
    return;
  }
  const sections = collectEditorSections();
  if (sections.length === 0) {
    updateStatus("The editor has no sections to save.", true);
    return;
  }
  updateBusy(true);
  updateStatus("Saving edited version...");
  const story = await api(`/api/stories/${state.activeStory.id}/manual-save`, {
    method: "POST",
    body: JSON.stringify({
      title: elements.storyTitle.value.trim() || "Untitled Story",
      note: elements.saveNote.value.trim() || "Manual edit",
      base_version_number: state.selectedVersionNumber,
      sections,
    }),
  });
  state.activeStory = story;
  state.selectedVersionNumber = story.active_version;
  resetDerivedState();
  seedComparisonSelectors(story);
  await refreshLibrary();
  renderStory(story);
  updateBusy(false);
  updateStatus("Manual edit saved as a new version.");
}

async function loadStory(storyId) {
  updateBusy(true);
  updateStatus("Loading story...");
  const story = await api(`/api/stories/${storyId}`);
  state.activeStory = story;
  state.selectedVersionNumber = story.active_version;
  resetDerivedState();
  seedComparisonSelectors(story);
  renderStory(story);
  updateBusy(false);
  updateStatus("Story loaded.");
}

async function generateComparisonPreview() {
  if (!state.activeStory) {
    updateStatus("Open a story before generating a comparison preview.", true);
    return;
  }
  updateBusy(true);
  updateStatus("Generating alternate style preview...");
  const preview = await api(`/api/stories/${state.activeStory.id}/compare-style`, {
    method: "POST",
    body: JSON.stringify({
      genre: elements.compareGenreSelect.value,
      tone: elements.compareToneSelect.value,
      writing_style: elements.compareStyleSelect.value,
      story_length: state.activeStory.story_length,
    }),
  });
  state.comparePreview = preview;
  state.comparePreviewStoryId = state.activeStory.id;
  renderComparison(state.activeStory, getSelectedVersion());
  updateBusy(false);
  updateStatus("Comparison preview generated.");
}

async function refreshLibrary() {
  state.stories = await api("/api/stories");
  renderLibrary();
}

function renderStory(story) {
  elements.metricStories.textContent = String(state.stories.length);
  if (!story) {
    elements.storyTitle.value = "Untitled Story";
    elements.storyMeta.textContent = "No story selected yet.";
    elements.emptyWorkspace.classList.remove("hidden");
    elements.sectionsContainer.replaceChildren();
    renderEmptyStructure();
    renderSuggestions(null, null, { nodes: [], edges: [] });
    renderCharacterGraph(null, null, { nodes: [], edges: [], passages: {} });
    renderVersions(null);
    renderComparison(null, null);
    renderLibrary();
    renderMetrics(null, null, { nodes: [] });
    renderNavSummary(null, null);
    return;
  }
  const version = getSelectedVersion();
  if (!version) {
    return;
  }
  elements.storyPrompt.value = story.prompt;
  elements.genreSelect.value = story.genre;
  elements.toneSelect.value = story.tone;
  elements.styleSelect.value = story.writing_style;
  elements.lengthInput.value = story.story_length;
  elements.storyTitle.value = story.title;
  elements.storyMeta.textContent =
    `${story.genre} | ${story.tone} | ${story.writing_style} | ${story.story_length} words target`;
  elements.emptyWorkspace.classList.add("hidden");
  ensureTimelineDraft(story, version);
  const network = deriveCharacterNetwork(story, version);
  renderSections(version);
  renderTimelineEditor(version);
  renderSuggestions(story, version, network);
  renderCharacterGraph(story, version, network);
  renderVersions(story);
  renderComparison(story, version);
  renderLibrary();
  renderMetrics(story, version, network);
  renderNavSummary(story, version);
}

function renderSections(version) {
  elements.sectionsContainer.replaceChildren();
  version.sections.forEach((section) => {
    const card = document.createElement("article");
    card.className = "section-card";

    const topLine = document.createElement("div");
    topLine.className = "section-topline";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = section.title;
    const meta = document.createElement("p");
    meta.className = "section-meta";
    meta.textContent = `${countWords(section.content)} words | ${section.summary}`;
    titleWrap.append(title, meta);

    const chip = document.createElement("span");
    chip.className = "section-chip";
    chip.textContent = section.id;
    topLine.append(titleWrap, chip);

    const area = document.createElement("textarea");
    area.className = "section-textarea";
    area.dataset.sectionId = section.id;
    area.dataset.sectionTitle = section.title;
    area.value = section.content;
    area.rows = Math.max(8, Math.ceil(section.content.length / 150));

    const footer = document.createElement("div");
    footer.className = "section-footer";
    const footText = document.createElement("p");
    footText.className = "helper-copy";
    footText.textContent = "Inline editing is versioned. Save to keep a manual draft snapshot.";

    const actions = document.createElement("div");
    actions.className = "section-actions";
    [
      { label: "Expand", instruction: `Expand the ${section.title.toLowerCase()} with stronger detail and emotional texture.` },
      { label: "Sharpen", instruction: `Sharpen the ${section.title.toLowerCase()} so the pacing is tighter and more precise.` },
      { label: "Condense", instruction: `Condense the ${section.title.toLowerCase()} without losing its narrative purpose.` },
    ].forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "section-action";
      button.textContent = action.label;
      button.addEventListener("click", () => appendInstruction(action.instruction));
      actions.append(button);
    });

    footer.append(footText, actions);
    card.append(topLine, area, footer);
    elements.sectionsContainer.append(card);
  });
}

function renderTimelineEditor(version) {
  elements.structureBarsContainer.replaceChildren();
  elements.timelineControlsContainer.replaceChildren();
  const distribution = getSectionDistribution(version);
  const markerRefs = {};

  distribution.forEach((item) => {
    const target = state.timelineDraft[item.id] ?? item.percent;

    const structureRow = document.createElement("article");
    structureRow.className = "structure-row";
    const head = document.createElement("div");
    head.className = "structure-row-head";
    const name = document.createElement("strong");
    name.textContent = item.title;
    const values = document.createElement("span");
    values.className = "helper-copy";
    values.textContent = `Current ${item.percent}% | Target ${target}%`;
    head.append(name, values);

    const bar = document.createElement("div");
    bar.className = "structure-bar";
    const fill = document.createElement("div");
    fill.className = "structure-fill";
    fill.style.width = `${item.percent}%`;
    const marker = document.createElement("div");
    marker.className = "structure-marker";
    marker.style.left = `calc(${target}% - 1px)`;
    markerRefs[item.id] = { marker, values, current: item.percent };
    bar.append(fill, marker);

    const caption = document.createElement("p");
    caption.className = "structure-caption";
    caption.textContent = `${item.words} words in this phase.`;
    structureRow.append(head, bar, caption);
    elements.structureBarsContainer.append(structureRow);

    const controlRow = document.createElement("label");
    controlRow.className = "timeline-control";
    const controlHead = document.createElement("div");
    controlHead.className = "timeline-control-head";
    const controlName = document.createElement("strong");
    controlName.textContent = item.title;
    const output = document.createElement("span");
    output.className = "helper-copy";
    output.textContent = `${target}% target`;
    controlHead.append(controlName, output);

    const range = document.createElement("input");
    range.type = "range";
    range.min = "10";
    range.max = "40";
    range.step = "1";
    range.value = String(target);
    range.addEventListener("input", () => {
      const value = Number(range.value);
      state.timelineDraft[item.id] = value;
      output.textContent = `${value}% target`;
      markerRefs[item.id].marker.style.left = `calc(${value}% - 1px)`;
      markerRefs[item.id].values.textContent = `Current ${markerRefs[item.id].current}% | Target ${value}%`;
      elements.timelineSummary.textContent = buildTimelineSummary(version);
    });

    controlRow.append(controlHead, range);
    elements.timelineControlsContainer.append(controlRow);
  });

  elements.timelineSummary.textContent = buildTimelineSummary(version);
}

function renderSuggestions(story, version, network) {
  elements.suggestionsContainer.replaceChildren();
  if (!story || !version) {
    elements.suggestionsContainer.append(buildPlaceholder("Generate a story to receive editorial suggestions."));
    return;
  }

  const suggestions = buildSuggestions(story, version, network);
  suggestions.forEach((suggestion) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";
    const title = document.createElement("h4");
    title.textContent = suggestion.title;
    const body = document.createElement("p");
    body.className = "suggestion-body";
    body.textContent = suggestion.detail;
    const footer = document.createElement("div");
    footer.className = "suggestion-footer";
    const type = document.createElement("span");
    type.className = "suggestion-type";
    type.textContent = suggestion.type;
    const action = document.createElement("button");
    action.type = "button";
    action.className = "section-action";
    action.textContent = suggestion.buttonLabel;
    action.addEventListener("click", () => executeSuggestion(suggestion));
    footer.append(type, action);
    card.append(title, body, footer);
    elements.suggestionsContainer.append(card);
  });
}

function renderCharacterGraph(story, version, network) {
  elements.characterGraph.replaceChildren();
  elements.characterDetail.replaceChildren();
  if (!story || !version || network.nodes.length === 0) {
    elements.characterGraphSummary.textContent = "Character relationships will appear here once a story is loaded.";
    elements.characterGraph.append(buildPlaceholder("No character graph available yet."));
    return;
  }

  if (!state.focusCharacter || !network.nodes.some((node) => node.label === state.focusCharacter)) {
    state.focusCharacter = network.nodes[0].label;
  }

  elements.characterGraphSummary.textContent =
    `${network.nodes.length} character nodes and ${network.edges.length} interaction links are currently tracked.`;
  elements.characterGraph.append(buildCharacterGraphSvg(network));

  const detailTitle = document.createElement("strong");
  detailTitle.textContent = state.focusCharacter;
  const detailText = document.createElement("p");
  detailText.textContent = `${network.passages[state.focusCharacter]?.length || 0} scene references tied to this character or role.`;
  elements.characterDetail.append(detailTitle, detailText);

  const scenes = document.createElement("div");
  scenes.className = "character-scenes";
  (network.passages[state.focusCharacter] || []).slice(0, 4).forEach((scene) => {
    const chip = document.createElement("div");
    chip.className = "scene-chip";
    chip.textContent = `${scene.section}: ${scene.snippet}`;
    scenes.append(chip);
  });
  if (scenes.childElementCount === 0) {
    scenes.append(buildPlaceholder("No detailed scenes found for the selected character."));
  }
  elements.characterDetail.append(scenes);
}

function renderVersions(story) {
  elements.versionsContainer.replaceChildren();
  if (!story) {
    elements.versionsContainer.append(buildPlaceholder("Saved versions will appear here."));
    return;
  }

  const versions = [...story.versions].sort((left, right) => right.version_number - left.version_number);
  versions.forEach((version) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "version-card";
    if (version.version_number === state.selectedVersionNumber) {
      button.classList.add("active");
    }
    button.addEventListener("click", () => {
      state.selectedVersionNumber = version.version_number;
      resetDerivedState({ keepComparison: false });
      seedComparisonSelectors(state.activeStory);
      renderStory(story);
      updateStatus(`Viewing version ${version.version_number}.`);
    });

    const title = document.createElement("p");
    title.className = "version-title";
    title.textContent = `Version ${version.version_number}`;

    const meta = document.createElement("p");
    meta.className = "version-meta";
    meta.textContent = `${version.note} | ${formatDate(version.created_at)}`;

    button.append(title, meta);
    elements.versionsContainer.append(button);
  });
}

function renderComparison(story, version) {
  if (!story || !version) {
    elements.comparisonCurrentTitle.textContent = "No story selected";
    elements.comparisonCurrentMeta.textContent = "Open a story to compare stylistic versions.";
    setComparisonPlaceholder(elements.comparisonCurrentPane, "The active story will appear here for side-by-side evaluation.");
    elements.comparisonPreviewTitle.textContent = "Awaiting preview";
    elements.comparisonPreviewMeta.textContent = "Generate an alternate style preview from the same prompt.";
    setComparisonPlaceholder(elements.comparisonPreviewPane, "The comparison preview appears here without altering the saved story.");
    elements.comparisonInsights.replaceChildren();
    return;
  }

  elements.comparisonCurrentTitle.textContent = story.title;
  elements.comparisonCurrentMeta.textContent =
    `${story.genre} | ${story.tone} | ${story.writing_style} | version ${version.version_number}`;
  renderComparisonDocument(elements.comparisonCurrentPane, version.sections);

  if (state.comparePreview && state.comparePreviewStoryId === story.id) {
    elements.comparisonPreviewTitle.textContent = state.comparePreview.title;
    elements.comparisonPreviewMeta.textContent =
      `${state.comparePreview.genre} | ${state.comparePreview.tone} | ${state.comparePreview.writing_style}`;
    renderComparisonDocument(elements.comparisonPreviewPane, state.comparePreview.version.sections);
    renderComparisonInsights(story, version, state.comparePreview);
    syncComparisonScroll();
  } else {
    elements.comparisonPreviewTitle.textContent = "Awaiting preview";
    elements.comparisonPreviewMeta.textContent = "Generate an alternate style preview from the same prompt.";
    setComparisonPlaceholder(elements.comparisonPreviewPane, "The comparison preview appears here without altering the saved story.");
    elements.comparisonInsights.replaceChildren();
    const chip = document.createElement("span");
    chip.className = "comparison-chip";
    chip.textContent = "Generate a parallel style to compare tone, pacing, and vocabulary.";
    elements.comparisonInsights.append(chip);
  }
}

function renderComparisonInsights(story, currentVersion, preview) {
  elements.comparisonInsights.replaceChildren();
  const currentWords = countWords(currentVersion.full_text);
  const previewWords = countWords(preview.version.full_text);
  [
    `Tone shift: ${story.tone} -> ${preview.tone}`,
    `Style shift: ${story.writing_style} -> ${preview.writing_style}`,
    `Word count: ${currentWords} vs ${previewWords}`,
    buildOpeningContrast(currentVersion, preview.version),
  ].forEach((text) => {
    const chip = document.createElement("span");
    chip.className = "comparison-chip";
    chip.textContent = text;
    elements.comparisonInsights.append(chip);
  });
}

function renderLibrary() {
  elements.libraryTableBody.replaceChildren();
  if (state.stories.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "library-empty";
    cell.textContent = "Generated stories will appear here once you start drafting.";
    row.append(cell);
    elements.libraryTableBody.append(row);
    return;
  }

  state.stories.forEach((story) => {
    const row = document.createElement("tr");
    if (state.activeStory && state.activeStory.id === story.id) {
      row.classList.add("active-row");
    }

    const titleCell = document.createElement("td");
    titleCell.className = "library-title-cell";
    const title = document.createElement("strong");
    title.textContent = story.title;
    const prompt = document.createElement("span");
    prompt.className = "helper-copy";
    prompt.textContent = truncate(story.prompt, 88);
    titleCell.append(title, prompt);

    const genreCell = document.createElement("td");
    genreCell.textContent = story.genre;
    const styleCell = document.createElement("td");
    styleCell.textContent = story.writing_style;
    const editedCell = document.createElement("td");
    editedCell.textContent = formatDate(story.updated_at);
    const versionCell = document.createElement("td");
    versionCell.textContent = String(story.version_count);

    const actionCell = document.createElement("td");
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "library-open";
    openButton.textContent = "Open";
    openButton.addEventListener("click", () => {
      loadStory(story.id).catch(handleError);
    });
    actionCell.append(openButton);

    row.append(titleCell, genreCell, styleCell, editedCell, versionCell, actionCell);
    elements.libraryTableBody.append(row);
  });
}

function renderMetrics(story, version, network) {
  if (!story || !version) {
    elements.metricVersion.textContent = "--";
    elements.metricWords.textContent = "0";
    elements.metricCharacters.textContent = "0";
    return;
  }
  elements.metricVersion.textContent = `v${version.version_number}`;
  elements.metricWords.textContent = String(countWords(version.full_text));
  elements.metricCharacters.textContent = String(network.nodes.length);
}

function renderNavSummary(story, version) {
  elements.navStorySummary.replaceChildren();
  const label = document.createElement("p");
  label.className = "sidebar-label";
  label.textContent = "Current Session";
  const title = document.createElement("h2");
  const body = document.createElement("p");

  if (!story || !version) {
    title.textContent = "No active draft";
    body.textContent = "Generate a story to populate the writing workspace, structure view, and comparison tools.";
  } else {
    title.textContent = story.title;
    body.textContent = `Working on version ${version.version_number} in ${story.genre} with a ${story.tone.toLowerCase()} tone and ${story.writing_style.toLowerCase()} prose.`;
  }

  elements.navStorySummary.append(label, title, body);
}

function renderEmptyStructure() {
  elements.structureBarsContainer.replaceChildren();
  elements.timelineControlsContainer.replaceChildren();
  elements.structureBarsContainer.append(buildPlaceholder("Story structure will appear here once a draft is generated."));
  elements.timelineControlsContainer.append(buildPlaceholder("Timeline controls are unlocked when a story is active."));
  elements.timelineSummary.textContent = "Use the sliders to rebalance narrative emphasis across the story.";
}

function collectEditorSections() {
  const sections = [];
  elements.sectionsContainer.querySelectorAll("textarea[data-section-id]").forEach((area) => {
    sections.push({
      id: area.dataset.sectionId,
      title: area.dataset.sectionTitle,
      content: area.value.trim(),
      summary: "",
    });
  });
  return sections;
}

function getSelectedVersion() {
  if (!state.activeStory) {
    return null;
  }
  return (
    state.activeStory.versions.find((version) => version.version_number === state.selectedVersionNumber) ||
    state.activeStory.versions[state.activeStory.versions.length - 1]
  );
}

function applyOptions() {
  fillSelect(elements.genreSelect, state.options.genres, "Fantasy");
  fillSelect(elements.toneSelect, state.options.tones, "Mysterious");
  fillSelect(elements.styleSelect, state.options.writing_styles, "Descriptive");
  fillSelect(elements.compareGenreSelect, state.options.genres, "Mystery");
  fillSelect(elements.compareToneSelect, state.options.tones, "Suspenseful");
  fillSelect(elements.compareStyleSelect, state.options.writing_styles, "Cinematic");
}

function fillSelect(selectElement, values, preferredValue) {
  selectElement.replaceChildren();
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === preferredValue;
    selectElement.append(option);
  });
}

function ensureTimelineDraft(story, version) {
  const key = `${story.id}:${version.version_number}`;
  if (state.timelineKey === key) {
    return;
  }
  state.timelineDraft = {};
  getSectionDistribution(version).forEach((item) => {
    state.timelineDraft[item.id] = item.percent;
  });
  state.timelineKey = key;
}

function resetDerivedState(options = {}) {
  state.focusCharacter = null;
  state.timelineDraft = {};
  state.timelineKey = null;
  if (!options.keepComparison) {
    state.comparePreview = null;
    state.comparePreviewStoryId = null;
  }
}

function seedComparisonSelectors(story) {
  if (!story || !state.options) {
    return;
  }
  elements.compareGenreSelect.value = chooseDifferentOption(state.options.genres, story.genre);
  elements.compareToneSelect.value = chooseDifferentOption(state.options.tones, story.tone);
  elements.compareStyleSelect.value = chooseDifferentOption(state.options.writing_styles, story.writing_style);
}

function chooseDifferentOption(options, current) {
  const match = options.find((option) => option !== current);
  return match || current;
}

function buildSuggestions(story, version, network) {
  const distribution = getSectionDistribution(version);
  const intro = distribution.find((item) => item.id === "introduction");
  const climax = distribution.find((item) => item.id === "climax");
  const resolution = distribution.find((item) => item.id === "resolution");
  const suggestions = [];

  if (network.nodes.length < 3) {
    suggestions.push({
      type: "Character",
      title: "Strengthen the supporting cast",
      detail: "The relationship graph is still sparse. Adding a named secondary character would make the conflict feel more grounded and trackable.",
      buttonLabel: "Use Brief",
      instruction: "Introduce a memorable secondary character with a clear relationship to the protagonist and visible impact on the conflict.",
    });
  }
  if (climax && climax.percent < 24) {
    suggestions.push({
      type: "Pacing",
      title: "Expand the climax",
      detail: "The climax occupies a relatively small portion of the current draft. Giving it more narrative space would improve dramatic payoff.",
      buttonLabel: "Use Brief",
      instruction: "Expand the climax with stronger tension, more decisive action, and a clearer emotional payoff.",
    });
  }
  if (intro && resolution && intro.percent - resolution.percent > 8) {
    suggestions.push({
      type: "Structure",
      title: "Tighten the opening and reinforce the ending",
      detail: "The introduction currently outweighs the resolution. Rebalancing those two sections would improve pacing and closure.",
      buttonLabel: "Use Brief",
      instruction: "Tighten the opening slightly and make the ending more resonant with a stronger sense of closure.",
    });
  }
  suggestions.push({
    type: "Style",
    title: "Run a style comparison against the current draft",
    detail: "Use the comparison panel to test how the same prompt behaves under a different genre, tone, or writing style.",
    buttonLabel: "Preview",
    comparison: {
      genre: chooseDifferentOption(state.options.genres, story.genre),
      tone: chooseDifferentOption(state.options.tones, story.tone),
      writing_style: chooseDifferentOption(state.options.writing_styles, story.writing_style),
    },
  });
  if (story.writing_style === "Descriptive") {
    suggestions.push({
      type: "Voice",
      title: "Test a more concise prose mode",
      detail: "A side comparison with a more cinematic or minimalist style can help evaluate pacing and readability.",
      buttonLabel: "Use Brief",
      instruction: "Keep the atmosphere, but streamline the prose so the pacing feels more cinematic and direct.",
    });
  } else {
    suggestions.push({
      type: "Voice",
      title: "Deepen the sensory texture",
      detail: "The current style is clear and efficient. A pass focused on atmosphere would make the scenes more immersive.",
      buttonLabel: "Use Brief",
      instruction: "Add stronger sensory detail and richer environmental description while preserving the current structure.",
    });
  }
  return suggestions.slice(0, 4);
}

function executeSuggestion(suggestion) {
  if (suggestion.instruction) {
    appendInstruction(suggestion.instruction);
    return;
  }
  if (suggestion.comparison) {
    elements.compareGenreSelect.value = suggestion.comparison.genre;
    elements.compareToneSelect.value = suggestion.comparison.tone;
    elements.compareStyleSelect.value = suggestion.comparison.writing_style;
    scrollToSection("comparisonSection");
    generateComparisonPreview().catch(handleError);
  }
}

function appendInstruction(instruction) {
  const existing = elements.refineInstruction.value.trim();
  elements.refineInstruction.value = existing ? `${existing} ${instruction}` : instruction;
  scrollToSection("suggestionSection");
  elements.refineInstruction.focus();
  updateStatus("Revision brief updated from the dashboard.");
}

function getSectionDistribution(version) {
  const items = version.sections.map((section) => ({
    id: section.id,
    title: section.title,
    words: countWords(section.content),
  }));
  const total = Math.max(1, items.reduce((sum, item) => sum + item.words, 0));
  return items.map((item) => ({
    ...item,
    percent: Math.max(10, Math.round((item.words / total) * 100)),
  }));
}

function buildTimelineSummary(version) {
  const distribution = getSectionDistribution(version);
  const deltas = distribution.map((item) => ({
    title: item.title,
    delta: (state.timelineDraft[item.id] ?? item.percent) - item.percent,
  }));
  const biggestIncrease = [...deltas].sort((left, right) => right.delta - left.delta)[0];
  const biggestDecrease = [...deltas].sort((left, right) => left.delta - right.delta)[0];
  if (!biggestIncrease || !biggestDecrease) {
    return "Use the sliders to rebalance narrative emphasis across the story.";
  }
  if (Math.abs(biggestIncrease.delta) < 2 && Math.abs(biggestDecrease.delta) < 2) {
    return "The pacing target remains close to the current structure, with only minor balancing adjustments.";
  }
  return `The current pacing plan expands ${biggestIncrease.title.toLowerCase()} by ${Math.max(0, biggestIncrease.delta)} points and tightens ${biggestDecrease.title.toLowerCase()} by ${Math.abs(Math.min(0, biggestDecrease.delta))} points.`;
}

function applyTimelineInstruction() {
  const version = getSelectedVersion();
  if (!state.activeStory || !version) {
    updateStatus("Open a story before using the timeline editor.", true);
    return;
  }
  const parts = getSectionDistribution(version).map((item) => {
    const target = state.timelineDraft[item.id] ?? item.percent;
    return `${item.title.toLowerCase()} around ${target}%`;
  });
  elements.refineInstruction.value =
    `Rebalance the story pacing with ${parts.join(", ")}. Expand the sections that gained emphasis, condense the sections that were reduced, and keep transitions coherent.`;
  scrollToSection("suggestionSection");
  updateStatus("Timeline pacing copied into the revision brief.");
}

function deriveCharacterNetwork(story, version) {
  const candidateCounts = new Map();
  const sourceText = [story.prompt, version.full_text].join(" ");
  const properMatches = sourceText.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?\b/g) || [];
  properMatches.forEach((match) => {
    const cleaned = match.trim();
    if (!NAME_IGNORE.has(cleaned)) {
      candidateCounts.set(cleaned, (candidateCounts.get(cleaned) || 0) + 1);
    }
  });

  ROLE_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const hits = sourceText.match(regex);
    if (hits && hits.length > 0) {
      const label = titleCase(word);
      candidateCounts.set(label, (candidateCounts.get(label) || 0) + hits.length);
    }
  });

  if (candidateCounts.size < 3) {
    extractPromptKeywords(story.prompt).forEach((keyword) => {
      candidateCounts.set(keyword, (candidateCounts.get(keyword) || 0) + 1);
    });
  }
  if (candidateCounts.size < 3) {
    (ROLE_SEEDS[story.genre] || []).forEach((label) => {
      candidateCounts.set(label, (candidateCounts.get(label) || 0) + 1);
    });
  }

  const nodes = [...candidateCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, count]) => ({ id: slugify(label), label, count }));
  if (nodes.length === 0) {
    return { nodes: [], edges: [], passages: {} };
  }

  const passages = {};
  nodes.forEach((node) => {
    passages[node.label] = [];
    version.sections.forEach((section) => {
      if (containsLabel(section.content, node.label) || containsLabel(section.summary, node.label)) {
        passages[node.label].push({
          section: section.title,
          snippet: findRelevantSnippet(section.content, node.label) || truncate(section.summary, 90),
        });
      }
    });
  });

  const edgeMap = new Map();
  version.sections.forEach((section) => {
    const paragraphs = section.content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    paragraphs.forEach((paragraph) => {
      const present = nodes.filter((node) => containsLabel(paragraph, node.label));
      for (let index = 0; index < present.length; index += 1) {
        for (let inner = index + 1; inner < present.length; inner += 1) {
          const pair = [present[index].label, present[inner].label].sort().join("::");
          edgeMap.set(pair, (edgeMap.get(pair) || 0) + 1);
        }
      }
    });
  });

  let edges = [...edgeMap.entries()].map(([pair, weight]) => {
    const [source, target] = pair.split("::");
    return { source, target, weight };
  });
  if (edges.length === 0 && nodes.length > 1) {
    edges = nodes.slice(0, -1).map((node, index) => ({
      source: node.label,
      target: nodes[index + 1].label,
      weight: 1,
    }));
  }
  return { nodes, edges, passages };
}

function buildCharacterGraphSvg(network) {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 320 220");
  svg.setAttribute("class", "graph-svg");

  const centerX = 160;
  const centerY = 110;
  const radiusX = 96;
  const radiusY = 72;
  const positions = {};

  network.nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, network.nodes.length) - Math.PI / 2;
    positions[node.label] = {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    };
  });

  network.edges.forEach((edge) => {
    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("x1", positions[edge.source].x);
    line.setAttribute("y1", positions[edge.source].y);
    line.setAttribute("x2", positions[edge.target].x);
    line.setAttribute("y2", positions[edge.target].y);
    line.setAttribute("stroke-width", String(1.4 + edge.weight));
    line.setAttribute("class", "graph-edge");
    svg.append(line);
  });

  network.nodes.forEach((node) => {
    const group = document.createElementNS(svgNs, "g");
    group.style.cursor = "pointer";
    group.addEventListener("click", () => {
      state.focusCharacter = node.label;
      renderCharacterGraph(state.activeStory, getSelectedVersion(), network);
    });

    const circle = document.createElementNS(svgNs, "circle");
    circle.setAttribute("cx", positions[node.label].x);
    circle.setAttribute("cy", positions[node.label].y);
    circle.setAttribute("r", "15");
    circle.setAttribute("class", `graph-node${state.focusCharacter === node.label ? " active" : ""}`);

    const text = document.createElementNS(svgNs, "text");
    text.setAttribute("x", positions[node.label].x);
    text.setAttribute("y", positions[node.label].y + 30);
    text.setAttribute("class", "graph-label");
    text.textContent = truncate(node.label, 14);

    group.append(circle, text);
    svg.append(group);
  });

  return svg;
}

function containsLabel(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

function findRelevantSnippet(text, label) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const match = sentences.find((sentence) => containsLabel(sentence, label));
  return match ? truncate(match.trim(), 110) : "";
}

function renderComparisonDocument(container, sections) {
  container.replaceChildren();
  container.classList.remove("comparison-placeholder");
  sections.forEach((section) => {
    const block = document.createElement("section");
    block.className = "comparison-section";
    const title = document.createElement("h5");
    title.textContent = section.title;
    const body = document.createElement("div");
    body.textContent = section.content;
    block.append(title, body);
    container.append(block);
  });
}

function setComparisonPlaceholder(container, message) {
  container.replaceChildren();
  container.classList.add("comparison-placeholder");
  container.textContent = message;
}

function syncComparisonScroll() {
  const left = elements.comparisonCurrentPane;
  const right = elements.comparisonPreviewPane;
  if (left.dataset.syncBound === "true") {
    return;
  }

  let syncing = false;
  const syncTo = (source, target) => {
    source.addEventListener("scroll", () => {
      if (syncing) {
        return;
      }
      syncing = true;
      target.scrollTop = source.scrollTop;
      setTimeout(() => {
        syncing = false;
      }, 0);
    });
  };

  syncTo(left, right);
  syncTo(right, left);
  left.dataset.syncBound = "true";
}

function buildOpeningContrast(currentVersion, previewVersion) {
  const currentOpening = currentVersion.sections[0]?.content || "";
  const previewOpening = previewVersion.sections[0]?.content || "";
  const currentLength = averageSentenceLength(currentOpening);
  const previewLength = averageSentenceLength(previewOpening);
  if (previewLength > currentLength + 3) {
    return "Preview opening uses longer, more descriptive sentences.";
  }
  if (previewLength < currentLength - 3) {
    return "Preview opening is tighter and more compressed.";
  }
  return "Preview opening stays close to the current pacing.";
}

function averageSentenceLength(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) {
    return 0;
  }
  const totalWords = sentences.reduce((sum, sentence) => sum + countWords(sentence), 0);
  return totalWords / sentences.length;
}

function extractPromptKeywords(prompt) {
  const matches = prompt.match(/[A-Za-z]{3,}/g) || [];
  const stop = new Set(["young", "ancient", "hidden", "beneath", "through", "their", "there", "where", "with", "from"]);
  return [...new Set(matches.map((item) => titleCase(item)).filter((item) => !stop.has(item.toLowerCase())))]
    .slice(0, 4);
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setActiveNav(targetId) {
  elements.navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });
}

function updateBusy(isBusy) {
  state.busy = isBusy;
  [
    elements.generateButton,
    elements.refineButton,
    elements.saveButton,
    elements.downloadButton,
    elements.compareButton,
    elements.applyTimelineButton,
  ].forEach((button) => {
    button.disabled = isBusy;
  });
}

function updateStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  const dot = document.querySelector(".status-dot");
  dot.style.background = isError ? "var(--danger)" : "var(--success)";
  dot.style.boxShadow = isError
    ? "0 0 0 6px rgba(200, 86, 72, 0.14)"
    : "0 0 0 6px rgba(47, 143, 102, 0.14)";
}

function downloadCurrentStory() {
  const version = getSelectedVersion();
  if (!state.activeStory || !version) {
    updateStatus("Generate or open a story before exporting.", true);
    return;
  }
  const content = `${elements.storyTitle.value.trim() || state.activeStory.title}\n\n${version.full_text}`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(state.activeStory.title)}-v${version.version_number}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
  updateStatus("Story exported.");
}

function buildPlaceholder(message) {
  const node = document.createElement("p");
  node.className = "library-empty";
  node.textContent = message;
  return node;
}

function countWords(text) {
  return (text.trim().match(/\b[\w'-]+\b/g) || []).length;
}

function truncate(value, size) {
  if (value.length <= size) {
    return value;
  }
  return `${value.slice(0, size - 1).trim()}...`;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "story";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function api(url, options = {}) {
  const settings = { ...options };
  settings.headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const response = await fetch(url, settings);
  if (!response.ok) {
    let message = "Request failed.";
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch (_error) {
      message = response.statusText || message;
    }
    throw new Error(message);
  }
  return response.json();
}

function handleError(error) {
  updateBusy(false);
  updateStatus(error.message || "Something went wrong.", true);
}
