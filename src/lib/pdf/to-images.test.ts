import { describe, expect, it } from "vitest";
import { pageImageName } from "./to-images";

describe("pageImageName", () => {
  it("pads page numbers to the page count width", () => {
    expect(pageImageName("report.pdf", 3, 12, "jpg")).toBe("report-03.jpg");
    expect(pageImageName("Informe.PDF", 7, 9, "png")).toBe("Informe-7.png");
    expect(pageImageName(".pdf", 1, 100, "jpg")).toBe("page-001.jpg");
  });
});
