import { describe, expect, it } from "vitest";

import { getEditPdfCopy, getEditPdfSeoCopy } from "./edit-pdf-copy";

describe("edit PDF copy", () => {
  it("keeps English editor labels and file limit together", () => {
    const copy = getEditPdfCopy(false, 42);

    expect(copy.title).toBe("Edit PDF");
    expect(copy.limit).toBe("Max 42 MB");
    expect(copy.tools.editText).toBe("Edit text");
    expect(copy.steps).toContain("Click «Download PDF»");
  });

  it("keeps Russian editor labels and SEO copy together", () => {
    const copy = getEditPdfCopy(true, 42);
    const seoCopy = getEditPdfSeoCopy(true);

    expect(copy.title).toBe("Редактировать PDF");
    expect(copy.limit).toBe("Макс. 42 МБ");
    expect(copy.tools.highlight).toBe("Маркер");
    expect(seoCopy.title).toBe("Редактировать PDF — PDFX");
  });
});
