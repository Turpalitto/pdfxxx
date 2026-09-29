# PDFX Direction 3 — Design QA

- Source visual truth: `/Users/turpal/.codex/generated_images/01a0a067-5dba-7e13-b788-62ba03a0b0ba/exec-7550799e-2ca1-42c7-ba2b-aa5a1f0d2fba.png`
- Figma working file: `https://www.figma.com/design/dTIZfQwwSNlgdGwqq5fJ9w`
- Desktop implementation capture: `/Users/turpal/Documents/pdfxxx/design-qa-desktop.png`
- Mobile implementation capture: `/Users/turpal/Documents/pdfxxx/design-qa-mobile.png`
- Desktop viewport: 1440 × 1024 CSS px, device scale factor 1; capture 1434 × 1024 px (vertical scrollbar reserved 6 px)
- Mobile viewport: 390 × 844 CSS px, device scale factor 1; capture 390 × 844 px
- State: Russian locale; home idle and search-result states; PDF-to-Excel empty upload state

## Full-view comparison evidence

The selected reference and desktop implementation were opened together at comparable desktop dimensions. The implementation preserves the reference's compact pill navigation, single-line product heading, privacy reassurance, command-style search, left category rail, quick-tool strip, two-column popular list, workflow recommendation, and compact all-tools continuation. The mobile capture confirms the same hierarchy collapses cleanly into a single-column upload flow.

## Focused comparison evidence

- Header and hero: matching compact navigation, restrained cream background, dark display type, search-first hierarchy, and small privacy panel.
- Discovery area: matching left rail, horizontal quick-access strip, two-column popular rows, muted separators, and existing category accent colors.
- Mobile upload: compact breadcrumb, tool icon/title, one primary upload action, browser-processing reassurance, and numbered instructions.

## Required fidelity surfaces

- Fonts and typography: existing Noto Sans/Georgia tokens retained; heading weight, compact UI scale, wrapping, and hierarchy match the source direction. No missing-font indicators or clipped text were found.
- Spacing and layout rhythm: desktop grid and mobile stack retain the reference proportions. No horizontal overflow was detected (`scrollWidth <= innerWidth`).
- Colors and visual tokens: only existing PDFX palette/category colors are used. Contrast remains clear on the cream background.
- Image and icon quality: all interface symbols use the existing Lucide icon package; no placeholder images, emoji icons, or rasterized UI were introduced.
- Copy and content: redundant marketing statistics, feature cards, second search field, and closing CTA were removed. Remaining copy is task-oriented and available in EN/RU.

## Comparison history

1. Initial pass found three P2 issues: a widowed final word in the desktop headline, a sparse recent row when history contained one item, and a disabled processing button competing with the mobile upload CTA.
2. Fixes: reduced the large-screen headline size, filled quick access with deduplicated popular fallbacks, and hid the processing CTA until a file is selected.
3. Post-fix evidence: `/Users/turpal/Documents/pdfxxx/design-qa-desktop.png` and `/Users/turpal/Documents/pdfxxx/design-qa-mobile.png`. No actionable P0/P1/P2 differences remain.

## Interaction and console verification

- Search query `объединить` returned exactly one relevant result and hid the full catalog during search.
- Utility category navigation resolved to `/?category=utility` and displayed 18 tools.
- Mobile empty state contains no inactive process button; the upload button is the sole primary action.
- Browser console errors checked: none.

## Follow-up polish

- P3: consider a small “show all recent” affordance after enough browsing history exists.

final result: passed
