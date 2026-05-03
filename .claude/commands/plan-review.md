Review and optimize a plan document, then update the file with findings.

The plan file is: docs/plans/$ARGUMENTS

## Step 1 — Read and understand the plan

Read the full plan file. Understand its goal, context, architecture, and implementation steps.

## Step 2 — Review the plan against the codebase

For each claim or assumption the plan makes, verify it against the actual codebase:

- **File paths & classes**: Do referenced files, classes, services, entities, and repositories actually exist? Are namespaces correct?
- **Conventions**: Does the plan follow project conventions from CLAUDE.md? (entity patterns, service patterns, API action patterns, PHPStan rules, frontend patterns)
- **Dependencies**: Are referenced packages, services, or env vars available? Are Symfony service configurations correct?
- **Architecture fit**: Does the proposed structure align with the existing domain-driven architecture? Are there existing abstractions that should be reused?
- **Database**: Are entity definitions consistent with Doctrine conventions? Are migrations correct?
- **Frontend**: Do imports, path aliases, component patterns, and service patterns match the codebase?

## Step 3 — Identify issues and improvements

Organize findings into:

**Errors** — Factual mistakes (wrong paths, nonexistent classes, incorrect assumptions about existing code)

**Risks** — Things that could break or cause problems (missing edge cases, race conditions, security gaps, performance concerns)

**Improvements** — Better approaches, simpler alternatives, existing abstractions that could be leveraged, unnecessary complexity

**Missing pieces** — Steps or details the plan omits that would be needed for implementation

## Step 4 — Update the plan file

Apply the findings directly to the plan:

- Fix errors inline (correct paths, class names, assumptions)
- Add warnings or notes for risks that need decisions
- Incorporate improvements into the plan steps
- Add missing steps or details where needed
- Do NOT add a separate "review findings" section — weave corrections into the plan naturally so it reads as a clean, improved plan
- Keep the plan's existing structure and voice — refine it, don't rewrite it
- If a section is already correct and complete, leave it alone

After updating, add a brief note at the top of the plan (under the title) indicating the review date, e.g.:
> Last reviewed: {today's date}
