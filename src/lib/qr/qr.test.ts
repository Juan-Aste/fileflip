import { describe, expect, it } from "vitest";
import { decodeQr } from "./read";
import { QUIET_ZONE, contactPayload, contrastRatio, qrMatrix, qrPixels, qrSvg, wifiPayload } from "./qr";

const roundTrip = (text: string, level: "L" | "M" | "Q" | "H" = "M") => {
  const { width, height, data } = qrPixels(qrMatrix(text, level), { dark: "#000000", light: "#ffffff" }, 400);
  return decodeQr(data, width, height);
};

describe("qr", () => {
  it("encodes text that a decoder reads back, at every correction level", () => {
    for (const level of ["L", "M", "Q", "H"] as const) {
      expect(roundTrip("https://fileflect.example/es?q=café&x=1", level)).toBe("https://fileflect.example/es?q=café&x=1");
    }
    expect(roundTrip("Olá, 中文 ✓")).toBe("Olá, 中文 ✓");
    expect(roundTrip("x".repeat(1500), "L")).toBe("x".repeat(1500));
  });

  it("fails with qrTooLong beyond the capacity", () => {
    expect(() => qrMatrix("x".repeat(3000), "H")).toThrow(expect.objectContaining({ code: "qrTooLong" }));
  });

  it("builds Wi-Fi payloads with escaping", () => {
    expect(wifiPayload({ ssid: 'Casa;"Ana"', password: "a:b\\c", security: "WPA", hidden: true })).toBe(
      String.raw`WIFI:T:WPA;S:Casa\;\"Ana\";P:a\:b\\c;H:true;;`,
    );
    expect(wifiPayload({ ssid: "Libre", password: "ignored", security: "nopass", hidden: false })).toBe("WIFI:T:nopass;S:Libre;;");
    expect(roundTrip(wifiPayload({ ssid: "Café", password: "secreto123", security: "WPA", hidden: false }))).toBe(
      "WIFI:T:WPA;S:Café;P:secreto123;;",
    );
  });

  it("builds vCards with only the filled fields", () => {
    const card = contactPayload({ firstName: "Ana", lastName: "Pérez, Jr.", phone: "+54 11 5555-0000", email: "", organization: "ACME; SA", url: "" });
    expect(card.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Pérez\\, Jr.;Ana;;;",
      "FN:Ana Pérez\\, Jr.",
      String.raw`ORG:ACME\; SA`,
      "TEL;TYPE=CELL:+54 11 5555-0000",
      "END:VCARD",
    ]);
  });

  it("renders SVG and pixels with the quiet zone and colors", () => {
    const matrix = qrMatrix("hello", "M");
    const svg = qrSvg(matrix, { dark: "#112233", light: "transparent" });
    expect(svg).toContain(`viewBox="0 0 ${matrix.size + 2 * QUIET_ZONE} ${matrix.size + 2 * QUIET_ZONE}"`);
    expect(svg).toContain('fill="#112233"');
    expect(svg).not.toContain("<rect");
    expect(svg).toContain(`M${QUIET_ZONE} ${QUIET_ZONE}h7v1h-7z`); // top-left finder row
    const px = qrPixels(matrix, { dark: "#112233", light: "#ffffff" }, 300);
    const scale = px.width / (matrix.size + 2 * QUIET_ZONE);
    expect(Number.isInteger(scale)).toBe(true);
    expect([...px.data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    const corner = (QUIET_ZONE * scale * px.width + QUIET_ZONE * scale) * 4;
    expect([...px.data.subarray(corner, corner + 4)]).toEqual([0x11, 0x22, 0x33, 255]);
  });

  it("measures contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#888888")).toBeLessThan(1.5);
  });
});
