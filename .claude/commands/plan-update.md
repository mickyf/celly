Update a plan document to reflect the current state of implementation.

The plan file is: docs/plans/$ARGUMENTS

## Step 1 — Read the plan

Read the full plan file. Identify all steps, components, and deliverables it describes.

## Step 2 — Check implementation status

For each item in the plan, verify against the codebase and git history what has actually been implemented:

- **Files & classes**: Do the planned files exist? Check with Glob/Grep.
- **Entities & migrations**: Have the entities been created? Have migrations been generated and run?
- **API endpoints**: Do the route definitions and action classes exist?
- **Frontend components**: Do the pages, components, and services exist?
- **Configuration**: Are env vars, service configs, and route imports in place?
- **Tests**: Have any planned tests been written?

Use `git log test..HEAD --no-merges --oneline` to see what commits relate to this plan.

## Step 3 — Update the plan

Update the plan file to reflect reality:

- Mark completed steps clearly (e.g. checkmarks, "DONE" labels, or a status line)
- For partially completed steps, note what's done and what remains
- If the implementation diverged from the plan (different approach, renamed classes, changed structure), update the plan to match what was actually built — the plan should be a truthful record, not an outdated wishlist
- Add any new steps or components that were implemented but weren't originally in the plan
- Update any "TODO" / "TBD" / "to be refined" sections if the decisions have been made in code
- If the entire plan is complete, add a status line at the top, e.g.:
  > **Status: IMPLEMENTED** — All steps completed on {date}.

Keep the plan's existing structure. Don't rewrite sections that are already accurate.
