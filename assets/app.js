const STORAGE_KEY = "ai-fellows-projects-v1";
const SYNC_CONFIG_KEY = "ai-fellows-github-sync-v1";
const SYNC_TOKEN_KEY = "ai-fellows-github-token-v1";

const STATUS_OPTIONS = [
  "Idea",
  "Planning",
  "Experiment",
  "Pilot",
  "Active",
  "Waiting",
  "Blocked",
  "Completed",
  "Archived",
];

const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const STATUS_RANK = new Map([
  ["Active", 1],
  ["Pilot", 2],
  ["Experiment", 3],
  ["Planning", 4],
  ["Waiting", 5],
  ["Blocked", 6],
  ["Idea", 7],
  ["Completed", 8],
  ["Archived", 9],
]);

const PRIORITY_RANK = new Map([
  ["High", 1],
  ["Medium", 2],
  ["Low", 3],
]);

const state = {
  projects: [],
  seedProjects: [],
  filters: {
    search: "",
    status: "",
    priority: "",
    category: "",
    fromDate: "",
    toDate: "",
  },
  sortField: "recommended",
  sortDirection: "asc",
  view: "table",
  github: loadGithubConfig(),
  githubSha: "",
  canEdit: false,
  syncMessage: "",
  syncTone: "",
};

const els = {
  metricTotal: document.querySelector("#metricTotal"),
  metricNeedsAction: document.querySelector("#metricNeedsAction"),
  metricDueSoon: document.querySelector("#metricDueSoon"),
  metricComplete: document.querySelector("#metricComplete"),
  syncStatus: document.querySelector("#syncStatus"),
  visibleCount: document.querySelector("#visibleCount"),
  viewTitle: document.querySelector("#viewTitle"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  priorityFilter: document.querySelector("#priorityFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  fromDate: document.querySelector("#fromDate"),
  toDate: document.querySelector("#toDate"),
  sortField: document.querySelector("#sortField"),
  sortDirection: document.querySelector("#sortDirection"),
  tableBody: document.querySelector("#projectTableBody"),
  emptyState: document.querySelector("#emptyState"),
  tableView: document.querySelector("#tableView"),
  reportView: document.querySelector("#reportView"),
  reportSummary: document.querySelector("#reportSummary"),
  nextStepsReport: document.querySelector("#nextStepsReport"),
  statusReport: document.querySelector("#statusReport"),
  printReportButton: document.querySelector("#printReportButton"),
  enableEditingButton: document.querySelector("#enableEditingButton"),
  addProjectButton: document.querySelector("#addProjectButton"),
  resetDataButton: document.querySelector("#resetDataButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  importJsonInput: document.querySelector("#importJsonInput"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  githubOwnerInput: document.querySelector("#githubOwnerInput"),
  githubRepoInput: document.querySelector("#githubRepoInput"),
  githubBranchInput: document.querySelector("#githubBranchInput"),
  githubPathInput: document.querySelector("#githubPathInput"),
  githubTokenInput: document.querySelector("#githubTokenInput"),
  saveSyncSettingsButton: document.querySelector("#saveSyncSettingsButton"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  closeAuthDialogButton: document.querySelector("#closeAuthDialogButton"),
  cancelAuthDialogButton: document.querySelector("#cancelAuthDialogButton"),
  dialog: document.querySelector("#projectDialog"),
  form: document.querySelector("#projectForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelDialogButton: document.querySelector("#cancelDialogButton"),
  deleteProjectButton: document.querySelector("#deleteProjectButton"),
  categoryOptions: document.querySelector("#categoryOptions"),
  projectId: document.querySelector("#projectId"),
  nameInput: document.querySelector("#nameInput"),
  statusInput: document.querySelector("#statusInput"),
  priorityInput: document.querySelector("#priorityInput"),
  categoryInput: document.querySelector("#categoryInput"),
  roleInput: document.querySelector("#roleInput"),
  initiativeInput: document.querySelector("#initiativeInput"),
  connectionInput: document.querySelector("#connectionInput"),
  goalsInput: document.querySelector("#goalsInput"),
  websiteInput: document.querySelector("#websiteInput"),
  partnersInput: document.querySelector("#partnersInput"),
  nextStepDateInput: document.querySelector("#nextStepDateInput"),
  targetDateInput: document.querySelector("#targetDateInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  nextStepInput: document.querySelector("#nextStepInput"),
  notesInput: document.querySelector("#notesInput"),
};

async function init() {
  const response = await fetch("assets/projects.json");
  const payload = await response.json();
  state.seedProjects = payload.projects.map(normalizeProject);
  state.projects = loadProjects();
  hydrateSyncForm();
  hydrateSelects();
  bindEvents();
  render();
  pullLatestPublicData().then((updated) => {
    if (updated) render();
  });
  if (readGithubToken()) await pullFromGithub(false);
}

function loadProjects() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [...state.seedProjects];

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed.map(normalizeProject);
    if (Array.isArray(parsed.projects)) return parsed.projects.map(normalizeProject);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return [...state.seedProjects];
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects, null, 2));
}

async function persistProjects(message = "Update AI Fellows project data") {
  saveProjects();
  render();
  if (state.canEdit) {
    await pushToGithub(message);
  }
}

function normalizeProject(project) {
  return {
    id: project.id || crypto.randomUUID(),
    name: clean(project.name),
    category: clean(project.category),
    role: clean(project.role),
    initiative: clean(project.initiative),
    connection: clean(project.connection),
    description: clean(project.description),
    goals: clean(project.goals),
    status: normalizeStatus(project.status),
    priority: normalizePriority(project.priority),
    website: clean(project.website),
    partners: clean(project.partners),
    nextStep: clean(project.nextStep),
    nextStepDate: cleanDate(project.nextStepDate),
    targetDate: cleanDate(project.targetDate),
    notes: clean(project.notes),
    sourceRow: project.sourceRow || "",
  };
}

function clean(value) {
  return typeof value === "string" ? value.trim() : value ? String(value).trim() : "";
}

function cleanDate(value) {
  const text = clean(value);
  if (!text) return "";
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : text.slice(0, 10);
}

function normalizeStatus(value) {
  const text = clean(value);
  const lower = text.toLowerCase();
  const aliases = {
    active: "Active",
    ongoing: "Active",
    "on-going": "Active",
    planning: "Planning",
    concept: "Idea",
    idea: "Idea",
    experiment: "Experiment",
    pilot: "Pilot",
    pending: "Waiting",
    waiting: "Waiting",
    blocked: "Blocked",
    completed: "Completed",
    archived: "Archived",
    otheraif: "Archived",
    "other aif": "Archived",
  };
  return STATUS_OPTIONS.includes(aliases[lower] || text) ? aliases[lower] || text : "Planning";
}

function normalizePriority(value) {
  const text = clean(value);
  const lower = text.toLowerCase();
  const aliases = { high: "High", medium: "Medium", low: "Low" };
  return aliases[lower] || text || "Medium";
}

function hydrateSelects() {
  fillSelect(els.statusFilter, ["", ...STATUS_OPTIONS], "All statuses");
  fillSelect(els.priorityFilter, ["", ...PRIORITY_OPTIONS], "All priorities");
  fillSelect(els.statusInput, STATUS_OPTIONS);
  fillSelect(els.priorityInput, PRIORITY_OPTIONS);
}

function fillSelect(select, values, blankLabel = "") {
  select.innerHTML = values
    .map((value) => {
      const label = value || blankLabel;
      return `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`;
    })
    .join("");
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => updateFilter("search", els.searchInput.value));
  els.statusFilter.addEventListener("change", () => updateFilter("status", els.statusFilter.value));
  els.priorityFilter.addEventListener("change", () => updateFilter("priority", els.priorityFilter.value));
  els.categoryFilter.addEventListener("change", () => updateFilter("category", els.categoryFilter.value));
  els.fromDate.addEventListener("change", () => updateFilter("fromDate", els.fromDate.value));
  els.toDate.addEventListener("change", () => updateFilter("toDate", els.toDate.value));
  els.sortField.addEventListener("change", () => {
    state.sortField = els.sortField.value;
    render();
  });
  els.sortDirection.addEventListener("change", () => {
    state.sortDirection = els.sortDirection.value;
    render();
  });
  els.clearFiltersButton.addEventListener("click", clearFilters);
  els.addProjectButton.addEventListener("click", () => openProjectDialog());
  els.resetDataButton.addEventListener("click", resetSeedData);
  els.exportJsonButton.addEventListener("click", exportJson);
  els.exportCsvButton.addEventListener("click", exportCsv);
  els.importJsonInput.addEventListener("change", importJson);
  els.enableEditingButton.addEventListener("click", openAuthDialog);
  els.authForm.addEventListener("submit", enableEditing);
  els.closeAuthDialogButton.addEventListener("click", closeAuthDialog);
  els.cancelAuthDialogButton.addEventListener("click", closeAuthDialog);
  els.printReportButton.addEventListener("click", () => {
    state.view = "report";
    syncViewButtons();
    render();
    window.print();
  });
  els.closeDialogButton.addEventListener("click", closeDialog);
  els.cancelDialogButton.addEventListener("click", closeDialog);
  els.deleteProjectButton.addEventListener("click", deleteCurrentProject);
  els.form.addEventListener("submit", saveProjectFromForm);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      syncViewButtons();
      render();
    });
  });

  document.querySelectorAll("th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const field = header.dataset.sort;
      if (state.sortField === field) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = field;
        state.sortDirection = "asc";
      }
      els.sortField.value = state.sortField;
      els.sortDirection.value = state.sortDirection;
      render();
    });
  });

  els.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-id]");
    if (button) openProjectDialog(button.dataset.editId);
  });
}

function updateFilter(key, value) {
  state.filters[key] = value;
  render();
}

function clearFilters() {
  state.filters = {
    search: "",
    status: "",
    priority: "",
    category: "",
    fromDate: "",
    toDate: "",
  };
  els.searchInput.value = "";
  els.statusFilter.value = "";
  els.priorityFilter.value = "";
  els.categoryFilter.value = "";
  els.fromDate.value = "";
  els.toDate.value = "";
  render();
}

async function resetSeedData() {
  const confirmed = window.confirm("Replace local edits with the original workbook data?");
  if (!confirmed) return;
  state.projects = [...state.seedProjects];
  await persistProjects("Reset AI Fellows project data to seed workbook");
}

function render() {
  const filtered = getFilteredProjects();
  document.body.classList.toggle("edit-locked", !state.canEdit);
  document.body.classList.toggle("edit-unlocked", state.canEdit);
  renderSyncStatus();
  updateDynamicOptions();
  renderMetrics();
  renderTable(filtered);
  renderReport(filtered);
  els.visibleCount.textContent = filtered.length;
  els.viewTitle.textContent = state.view === "report" ? "Report" : "Projects";
  els.tableView.hidden = state.view !== "table";
  els.reportView.hidden = state.view !== "report";
}

function updateDynamicOptions() {
  const categories = [...new Set(state.projects.map((project) => project.category).filter(Boolean))].sort();
  const currentCategory = els.categoryFilter.value;
  fillSelect(els.categoryFilter, ["", ...categories], "All categories");
  els.categoryFilter.value = currentCategory;
  els.categoryOptions.innerHTML = categories
    .map((category) => `<option value="${escapeAttr(category)}"></option>`)
    .join("");
}

function renderMetrics() {
  const today = startOfToday();
  const needsAction = state.projects.filter((project) => !project.nextStep || !project.nextStepDate).length;
  const overdue = state.projects.filter((project) => {
    const date = parseDate(project.nextStepDate || project.targetDate);
    return date && date < today && project.status !== "Completed";
  }).length;
  const complete = state.projects.filter((project) => project.status === "Completed").length;

  els.metricTotal.textContent = state.projects.length;
  els.metricNeedsAction.textContent = needsAction;
  els.metricDueSoon.textContent = overdue;
  els.metricComplete.textContent = complete;
}

function renderTable(projects) {
  els.emptyState.hidden = projects.length > 0;
  els.tableBody.innerHTML = projects.map(renderProjectRow).join("");
}

function renderProjectRow(project) {
  const nextDate = project.nextStepDate || "";
  const targetDate = project.targetDate || "";
  const nextDateClass = dateClass(nextDate);
  const targetDateClass = dateClass(targetDate);
  const description = project.description || project.notes || "";
  const website = project.website
    ? `<a href="${escapeAttr(project.website)}" target="_blank" rel="noreferrer">${escapeHtml(project.name)}</a>`
    : escapeHtml(project.name);

  return `
    <tr>
      <td>
        <div class="project-name">
          <strong>${website}</strong>
          <span>${escapeHtml(truncate(description, 150))}</span>
        </div>
      </td>
      <td>${statusPill(project.status)}</td>
      <td>${priorityPill(project.priority)}</td>
      <td>
        <div class="date-stack">
          <strong class="${nextDateClass}">${formatDate(nextDate) || "No date"}</strong>
          <span>${escapeHtml(project.nextStep || "Needs next step")}</span>
        </div>
      </td>
      <td>
        <div class="date-stack">
          <strong class="${targetDateClass}">${formatDate(targetDate) || "No date"}</strong>
          <span>${escapeHtml(project.initiative || project.connection || "")}</span>
        </div>
      </td>
      <td>${escapeHtml(project.category || "")}</td>
      <td>
        <strong>${escapeHtml(project.role || "")}</strong>
        <div class="muted">${escapeHtml(project.partners || "")}</div>
      </td>
      <td>
        <div class="row-actions">
          <button class="link-button edit-only" type="button" data-edit-id="${escapeAttr(project.id)}">Edit</button>
        </div>
      </td>
    </tr>`;
}

function renderReport(projects) {
  const total = projects.length;
  const completed = projects.filter((project) => project.status === "Completed").length;
  const high = projects.filter((project) => project.priority === "High").length;
  const missingNext = projects.filter((project) => !project.nextStep).length;

  els.reportSummary.innerHTML = [
    reportCard("Projects", total),
    reportCard("Completed", completed),
    reportCard("High priority", high),
    reportCard("Missing next step", missingNext),
  ].join("");

  const actionProjects = projects
    .filter((project) => project.status !== "Completed")
    .sort(compareRecommended)
    .slice(0, 18);

  els.nextStepsReport.innerHTML =
    actionProjects.length > 0
      ? `<div class="report-list">${actionProjects.map(renderReportItem).join("")}</div>`
      : `<div class="empty-state">No open next steps in this report range.</div>`;

  const counts = countBy(projects, "status");
  const max = Math.max(...Object.values(counts), 1);
  els.statusReport.innerHTML = `<div class="status-bars">${Object.entries(counts)
    .sort(([a], [b]) => statusRank(a) - statusRank(b))
    .map(([status, count]) => {
      const width = Math.max(8, (count / max) * 100);
      return `
        <div class="status-bar">
          <span>${escapeHtml(status)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
          <strong>${count}</strong>
        </div>`;
    })
    .join("")}</div>`;
}

function reportCard(label, value) {
  return `<article class="report-card"><span class="muted">${escapeHtml(label)}</span><strong>${value}</strong></article>`;
}

function renderReportItem(project) {
  const date = project.nextStepDate || project.targetDate;
  return `
    <article class="report-item">
      <strong>${escapeHtml(project.name)}</strong>
      <span>${statusPill(project.status)} ${priorityPill(project.priority)}</span>
      <span>${escapeHtml(project.nextStep || "Needs next step")} ${date ? `| ${formatDate(date)}` : ""}</span>
    </article>`;
}

function getFilteredProjects() {
  const search = state.filters.search.toLowerCase();
  const from = parseDate(state.filters.fromDate);
  const to = parseDate(state.filters.toDate);

  return state.projects
    .filter((project) => {
      if (state.filters.status && project.status !== state.filters.status) return false;
      if (state.filters.priority && project.priority !== state.filters.priority) return false;
      if (state.filters.category && project.category !== state.filters.category) return false;
      if (search && !searchableText(project).includes(search)) return false;

      const projectDate = parseDate(project.nextStepDate || project.targetDate);
      if (from && (!projectDate || projectDate < from)) return false;
      if (to && (!projectDate || projectDate > to)) return false;
      return true;
    })
    .sort(getComparator());
}

function getComparator() {
  const direction = state.sortDirection === "desc" ? -1 : 1;
  if (state.sortField === "recommended") {
    return (a, b) => compareRecommended(a, b) * direction;
  }
  return (a, b) => compareField(a, b, state.sortField) * direction;
}

function compareRecommended(a, b) {
  return (
    statusRank(a.status) - statusRank(b.status) ||
    compareDate(a.nextStepDate, b.nextStepDate) ||
    priorityRank(a.priority) - priorityRank(b.priority) ||
    a.name.localeCompare(b.name)
  );
}

function compareField(a, b, field) {
  if (field === "nextStepDate" || field === "targetDate") return compareDate(a[field], b[field]);
  if (field === "priority") return priorityRank(a.priority) - priorityRank(b.priority);
  if (field === "status") return statusRank(a.status) - statusRank(b.status);
  return clean(a[field]).localeCompare(clean(b[field]));
}

function compareDate(a, b) {
  const left = parseDate(a);
  const right = parseDate(b);
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.getTime() - right.getTime();
}

function statusRank(status) {
  return STATUS_RANK.get(status) || 99;
}

function priorityRank(priority) {
  return PRIORITY_RANK.get(priority) || 99;
}

function searchableText(project) {
  return Object.values(project).join(" ").toLowerCase();
}

function openProjectDialog(id = "") {
  if (!state.canEdit) {
    window.alert("Enable editor sync with your GitHub token before editing.");
    return;
  }
  const project = id ? state.projects.find((item) => item.id === id) : createBlankProject();
  if (!project) return;

  els.dialogTitle.textContent = id ? "Edit project" : "Add project";
  els.deleteProjectButton.hidden = !id;
  els.projectId.value = project.id;
  els.nameInput.value = project.name;
  els.statusInput.value = project.status;
  els.priorityInput.value = project.priority;
  els.categoryInput.value = project.category;
  els.roleInput.value = project.role;
  els.initiativeInput.value = project.initiative;
  els.connectionInput.value = project.connection;
  els.goalsInput.value = project.goals;
  els.websiteInput.value = project.website;
  els.partnersInput.value = project.partners;
  els.nextStepDateInput.value = project.nextStepDate;
  els.targetDateInput.value = project.targetDate;
  els.descriptionInput.value = project.description;
  els.nextStepInput.value = project.nextStep;
  els.notesInput.value = project.notes;
  els.dialog.showModal();
  els.nameInput.focus();
}

function closeDialog() {
  els.dialog.close();
  els.form.reset();
}

function openAuthDialog() {
  hydrateSyncForm();
  els.authDialog.showModal();
  els.githubTokenInput.focus();
}

function closeAuthDialog() {
  els.authDialog.close();
  els.authForm.reset();
  hydrateSyncForm();
}

function createBlankProject() {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    role: "Lead",
    initiative: "AI Fellows",
    connection: "",
    description: "",
    goals: "",
    status: "Planning",
    priority: "Medium",
    website: "",
    partners: "",
    nextStep: "",
    nextStepDate: "",
    targetDate: "",
    notes: "",
    sourceRow: "",
  };
}

async function saveProjectFromForm(event) {
  event.preventDefault();
  const project = normalizeProject({
    id: els.projectId.value,
    name: els.nameInput.value,
    status: els.statusInput.value,
    priority: els.priorityInput.value,
    category: els.categoryInput.value,
    role: els.roleInput.value,
    initiative: els.initiativeInput.value,
    connection: els.connectionInput.value,
    goals: els.goalsInput.value,
    website: els.websiteInput.value,
    partners: els.partnersInput.value,
    nextStepDate: els.nextStepDateInput.value,
    targetDate: els.targetDateInput.value,
    description: els.descriptionInput.value,
    nextStep: els.nextStepInput.value,
    notes: els.notesInput.value,
  });

  const index = state.projects.findIndex((item) => item.id === project.id);
  if (index >= 0) {
    state.projects[index] = project;
  } else {
    state.projects.unshift(project);
  }

  closeDialog();
  await persistProjects(`Update project: ${project.name}`);
}

async function deleteCurrentProject() {
  const id = els.projectId.value;
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;
  const confirmed = window.confirm(`Delete "${project.name}"?`);
  if (!confirmed) return;
  state.projects = state.projects.filter((item) => item.id !== id);
  closeDialog();
  await persistProjects(`Delete project: ${project.name}`);
}

function exportJson() {
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    projects: state.projects,
  };
  downloadFile("ai-fellows-projects.json", JSON.stringify(payload, null, 2), "application/json");
}

function exportCsv() {
  const headers = [
    "name",
    "category",
    "role",
    "initiative",
    "connection",
    "description",
    "goals",
    "status",
    "priority",
    "website",
    "partners",
    "nextStep",
    "nextStepDate",
    "targetDate",
    "notes",
  ];
  const rows = getFilteredProjects().map((project) => headers.map((header) => csvValue(project[header])));
  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  downloadFile("ai-fellows-project-report.csv", csv, "text/csv");
}

async function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const projects = Array.isArray(parsed) ? parsed : parsed.projects;
    if (!Array.isArray(projects)) throw new Error("No projects array found.");
    state.projects = projects.map(normalizeProject);
    await persistProjects("Import AI Fellows project data");
  } catch (error) {
    window.alert(`Import failed: ${error.message}`);
  } finally {
    els.importJsonInput.value = "";
  }
}

function loadGithubConfig() {
  const defaults = {
    owner: "profgarygraves",
    repo: "ai-fellows-project-dashboard",
    branch: "main",
    path: "assets/projects.json",
  };

  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

function hydrateSyncForm() {
  els.githubOwnerInput.value = state.github.owner;
  els.githubRepoInput.value = state.github.repo;
  els.githubBranchInput.value = state.github.branch;
  els.githubPathInput.value = state.github.path;
  els.githubTokenInput.value = readGithubToken();
}

function readGithubToken() {
  return sessionStorage.getItem(SYNC_TOKEN_KEY) || "";
}

function currentGithubConfig() {
  return {
    owner: clean(els.githubOwnerInput.value) || "profgarygraves",
    repo: clean(els.githubRepoInput.value) || "ai-fellows-project-dashboard",
    branch: clean(els.githubBranchInput.value) || "main",
    path: clean(els.githubPathInput.value) || "assets/projects.json",
  };
}

async function enableEditing(event) {
  event.preventDefault();
  state.github = currentGithubConfig();
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(state.github));
  const token = clean(els.githubTokenInput.value);
  if (token) sessionStorage.setItem(SYNC_TOKEN_KEY, token);

  if (!readGithubToken()) {
    setSyncStatus("Paste a GitHub token to enable editing.", "error");
    render();
    return;
  }

  await pullFromGithub(true);
}

async function pullLatestPublicData() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  const { owner, repo, branch, path } = state.github;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}?t=${Date.now()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const payload = await response.json();
    if (!Array.isArray(payload.projects)) return;
    state.projects = payload.projects.map(normalizeProject);
    saveProjects();
    return true;
  } catch {
    // The bundled seed remains the offline fallback.
  }
  return false;
}

async function pullFromGithub(showAlerts) {
  if (!readGithubToken()) {
    if (showAlerts) window.alert("Paste your GitHub token first.");
    render();
    return;
  }

  setSyncStatus("Pulling latest GitHub data...");
  try {
    const data = await githubRequest("GET");
    const payload = JSON.parse(decodeBase64(data.content || ""));
    if (!Array.isArray(payload.projects)) throw new Error("GitHub data file does not contain a projects array.");
    state.githubSha = data.sha;
    state.projects = payload.projects.map(normalizeProject);
    saveProjects();
    state.canEdit = true;
    setSyncStatus("Editor mode active. Synced from GitHub.", "ready");
    if (els.authDialog.open) closeAuthDialog();
    render();
  } catch (error) {
    state.canEdit = false;
    sessionStorage.removeItem(SYNC_TOKEN_KEY);
    setSyncStatus(`GitHub pull failed: ${error.message}`, "error");
    if (showAlerts) window.alert(`GitHub pull failed: ${error.message}`);
    render();
  }
}

async function pushToGithub(message) {
  if (!readGithubToken()) {
    setSyncStatus("Local changes saved. GitHub token missing.", "error");
    return;
  }

  setSyncStatus("Saving to GitHub...");
  try {
    if (!state.githubSha) {
      const current = await githubRequest("GET");
      state.githubSha = current.sha;
    }

    const payload = {
      schemaVersion: 1,
      generatedFrom: "AI Fellows Project Dashboard",
      generatedAt: new Date().toISOString(),
      statusWorkflow: STATUS_OPTIONS,
      projects: state.projects.map(normalizeProject),
    };

    const result = await githubRequest("PUT", {
      message,
      branch: state.github.branch,
      sha: state.githubSha,
      content: encodeBase64(`${JSON.stringify(payload, null, 2)}\n`),
    });
    state.githubSha = result.content.sha;
    setSyncStatus("Saved to GitHub.", "ready");
  } catch (error) {
    setSyncStatus(`GitHub save failed: ${error.message}`, "error");
    window.alert(`GitHub save failed: ${error.message}`);
  }
}

async function githubRequest(method, body) {
  state.github = currentGithubConfig();
  const { owner, repo, branch, path } = state.github;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${method === "GET" ? `?ref=${branch}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${readGithubToken()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `GitHub API returned ${response.status}`);
  }
  return data;
}

function renderSyncStatus() {
  if (state.syncMessage) {
    els.syncStatus.textContent = state.syncMessage;
    els.syncStatus.classList.toggle("ready", state.syncTone === "ready");
    els.syncStatus.classList.toggle("error", state.syncTone === "error");
    return;
  }

  if (state.canEdit) {
    els.syncStatus.textContent = "Editor mode active. Changes sync to GitHub.";
    els.syncStatus.classList.add("ready");
    els.syncStatus.classList.remove("error");
  } else {
    els.syncStatus.textContent = "Read-only public view. Enable editing to make changes.";
    els.syncStatus.classList.remove("ready", "error");
  }
}

function setSyncStatus(message, tone = "") {
  state.syncMessage = message;
  state.syncTone = tone;
  els.syncStatus.textContent = message;
  els.syncStatus.classList.toggle("ready", tone === "ready");
  els.syncStatus.classList.toggle("error", tone === "error");
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  const text = clean(value).replaceAll('"', '""');
  return `"${text}"`;
}

function countBy(projects, field) {
  return projects.reduce((acc, project) => {
    const value = project[field] || "Unassigned";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function statusPill(status) {
  return `<span class="pill ${statusClass(status)}">${escapeHtml(status || "Unassigned")}</span>`;
}

function priorityPill(priority) {
  const cls = `priority-${(priority || "medium").toLowerCase()}`;
  return `<span class="pill ${cls}">${escapeHtml(priority || "Medium")}</span>`;
}

function statusClass(status) {
  const normalized = (status || "other").toLowerCase().replace(/\s+/g, "-");
  const known = [
    "active",
    "planning",
    "idea",
    "experiment",
    "pilot",
    "waiting",
    "blocked",
    "completed",
    "archived",
  ];
  return known.includes(normalized) ? `status-${normalized}` : "status-other";
}

function dateClass(value) {
  const date = parseDate(value);
  if (!date) return "";
  const today = startOfToday();
  if (date < today) return "overdue";
  if (date <= addDays(today, 30)) return "due-soon";
  return "";
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function truncate(value, max) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function syncViewButtons() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
}

init().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><div class="empty-state">Dashboard failed to load: ${escapeHtml(
    error.message,
  )}</div></main>`;
});
