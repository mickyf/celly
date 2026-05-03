Perform a code review of all changes in the current branch compared to the base branch (`test`), including any uncommitted changes. Exclude merge commits.

Follow these steps:

1. Run the following commands to gather the changes:
   - `git log test..HEAD --no-merges --pretty=format:"%h %s"` to list non-merge commits
   - `git diff test..HEAD -- . ':!yarn.lock' ':!composer.lock'` to get the full diff of branch changes (excluding lock files)
   - `git diff -- . ':!yarn.lock' ':!composer.lock'` to get uncommitted changes (excluding lock files)

2. Review all the changes and provide feedback organized in these categories:

   **Bugs & Correctness** - Logic errors, off-by-one errors, null/undefined risks, race conditions, missing error handling

   **Security** - Injection vulnerabilities, auth/authz issues, sensitive data exposure, OWASP top 10

   **Performance** - N+1 queries, unnecessary re-renders, missing indexes, inefficient algorithms

   **Code Quality** - Naming, readability, duplication, SOLID violations, dead code

   **Architecture & Patterns** - Consistency with project conventions (check CLAUDE.md), proper use of existing abstractions

   **PHPStan & Type Safety** - Violations of critical PHPStan rules documented in CLAUDE.md (Auditable trait, no direct DateTime, no empty(), DateType for parameters, etc.)

3. For each finding:
   - Reference the specific file and line
   - Explain what the issue is and why it matters
   - Suggest a fix

4. At the end, provide a short summary: how the changes look overall, what are the most critical items to address before merging, and anything that looks good and worth calling out.

Keep the review pragmatic. Focus on things that actually matter. Don't nitpick formatting or style unless it hurts readability.
