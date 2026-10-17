# Current Context

<!-- PROJECT-MEMORY-KIT:AUTOMATIC -->
- **Current focus:** Fix footnote numbering resets and preserve Roman, letter and hierarchical Word-to-PDF markers
- **Last completed step:** Replaced document-wide count guard with paragraph text/occurrence mapping excluding notes; restored numbering through inherited styles, formats, levels and overrides; added regression coverage
- **What changed:** Replaced document-wide count guard with paragraph text/occurrence mapping excluding notes; restored numbering through inherited styles, formats, levels and overrides; added regression coverage
- **What needs verification:** Browser regression red then green; TypeScript, ESLint, Prettier, build passed; Vitest 213 passed; full Playwright 81 passed/3 skipped before final letter-sequence correction, targeted numbering desktop/mobile 2 passed afterward
- **Next logical step:** User authorized committing and pushing the validated changes to synchronize local main with origin/main.
- **Important warnings:** Nonstandard formats, Roman outside 1-3999 and excessively long repeated letter labels remain fallback; full Word layout fidelity not claimed
- **Affected files:** client/src/lib/pdf-utils.ts,client/src/lib/docx-lists.test.ts,tests/e2e/conversion-improvements.spec.ts,.ai/changelog.md,.ai/tasks.md,.ai/architecture.md,.ai/decisions.md
- **Git status:** M .ai/architecture.md
 M .ai/changelog.md
 M .ai/decisions.md
 M .ai/tasks.md
 M DECISIONS.md
 M PROJECT_STATE.md
 M client/src/App.tsx
 M client/src/lib/pdf-converters-golden.test.ts
 M client/src/lib/pdf-utils.ts
 M client/src/pages/tool-page.tsx
 M client/src/tools/registry.test.ts
 M client/src/tools/registry.ts
 M client/src/workers/pdf-worker-types.ts
 M client/src/workers/pdf-worker.ts
 M graph/project_graph.json
 M memory/.project-memory.json
 M memory/CURRENT_CONTEXT.md
?? client/src/components/error-boundary.tsx
?? client/src/lib/docx-lists.test.ts
?? memory/sessions/2026-10-17_18-21_github-branch-assessment.md
?? memory/sessions/2026-10-17_22-18_selective-office-improvements.md
?? memory/sessions/2026-10-17_23-37_office-transfer-review.md
?? tests/e2e/conversion-improvements.spec.ts
