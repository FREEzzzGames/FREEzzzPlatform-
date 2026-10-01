import { describe, expect, it } from "vitest";
import { frameAsciiArt, generateAsciiText, normalizeAsciiText } from "../../ascii-generator/ascii-generator";

describe("ascii-generator", () => {
  it("normalizes input deterministically", () => {
    expect(normalizeAsciiText("  freezzz\nignored")).toBe("FREEZZZ");
    expect(normalizeAsciiText("a".repeat(100))).toHaveLength(40);
  });

  it("generates seven-line ASCII text", () => {
    const result = generateAsciiText("AB", "block");
    const lines = result.split("\n");
    expect(lines).toHaveLength(7);
    expect(lines.every(line => line.length > 0)).toBe(true);
    expect(result).toContain("████");
  });

  it("uses a different deterministic glyph style", () => {
    const block = generateAsciiText("A", "block");
    const dots = generateAsciiText("A", "dots");
    expect(block).not.toBe(dots);
    expect(dots).toContain("░");
  });

  it("falls back to a question glyph for unsupported characters", () => {
    const result = generateAsciiText("@", "slim");
    expect(result).toContain("##");
  });

  it("frames generated art without losing any row", () => {
    const result = frameAsciiArt("AB\nCD", "TEST");
    const lines = result.split("\n");
    expect(lines[0]).toBe("+------+");
    expect(lines[1]).toBe("| TEST |");
    expect(lines).toContain("| AB   |");
    expect(lines).toContain("| CD   |");
    expect(lines.at(-1)).toBe("+------+");
  });
});
