# Session

## Goal

Fix footnote numbering resets and preserve Roman, letter and hierarchical Word-to-PDF markers

## What was inspected

Project files, memory, and Git state as relevant.

## Changes made

Replaced document-wide count guard with paragraph text/occurrence mapping excluding notes; restored numbering through inherited styles, formats, levels and overrides; added regression coverage

## Files affected

client/src/lib/pdf-utils.ts,client/src/lib/docx-lists.test.ts,tests/e2e/conversion-improvements.spec.ts,.ai/changelog.md,.ai/tasks.md,.ai/architecture.md,.ai/decisions.md

## Decisions

None recorded.

## Tests / validation

Browser regression red then green; TypeScript, ESLint, Prettier, build passed; Vitest 213 passed; full Playwright 81 passed/3 skipped before final letter-sequence correction, targeted numbering desktop/mobile 2 passed afterward

## Problems encountered

Nonstandard formats, Roman outside 1-3999 and excessively long repeated letter labels remain fallback; full Word layout fidelity not claimed

## Remaining work

None recorded.

## Recommended next step

Requested numbering bugs fixed in local main working tree; no commit or push requested
