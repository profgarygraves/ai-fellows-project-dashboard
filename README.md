# AI Fellows Project Dashboard

A static, GitHub Pages-ready dashboard for tracking AI Fellows projects.

## What it does

- Sorts projects by recommended priority: status, next action date, priority, then name.
- Uses a standard workflow: Idea, Planning, Experiment, Pilot, Active, Waiting, Blocked, Completed, Archived.
- Filters by search, status, priority, category, and action date range.
- Lets public visitors view, filter, and print the dashboard.
- Lets an authenticated editor add, edit, delete, and sync projects back to GitHub.
- Lets an authenticated editor reset all statuses back to the standardized workbook baseline.
- Exports all project data as JSON.
- Exports the current filtered view as CSV for reports.
- Prints the report view for date/status snapshots.

## Editing and GitHub sync

GitHub Pages cannot safely hide a real edit password in static website code. This site therefore uses GitHub permissions for edit protection:

1. Public visitors can view the dashboard.
2. Editors click **Enable editing**.
3. Editors paste a fine-grained GitHub token with Contents read/write access to this repository.
4. After GitHub validates the token, edit controls, import/export, and automatic sync are unlocked.
5. Project edits commit directly to `assets/projects.json` on GitHub.

The token is kept in session storage for the current browser tab. It is not committed to the repo.

## Run locally

From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish on GitHub Pages

Put this folder in a GitHub repository and enable GitHub Pages from the repository settings. Use the repository root or the `/docs` folder setting depending on where you place these files.

For a simple project site, the contents of this folder can also be copied to a repository named `ai-fellows-project-dashboard` and published from the `main` branch root.
