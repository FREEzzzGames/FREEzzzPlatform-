import { describe, expect, it } from "vitest";
import { NES_BUTTON, NESAdapter, NESEmulator } from "../../emulators/nes/nes-emulator";

describe("Stage 13 — First Emulator", () => {
  it("boots the NES reference core and maintains deterministic 60 Hz frame pacing", () => {
    const emulator = new NESEmulator();
    emulator.start({ emulator: emulator.metadata });

    emulator.loadProgram(new Uint8Array([0xea, 0xea, 0xea, 0x00]));
    emulator.reset();
    emulator.runFrame();
    emulator.runFrame();

    expect(emulator.getStatus()).toBe("running");
    expect(emulator.getFrameCounter()).toBe(2);
    expect(emulator.timing.now()).toBeCloseTo(1000 / 60 * 2);
  });

  it("executes the reference 6502 bootstrap instructions", () => {
    const emulator = new NESEmulator();
    emulator.start({ emulator: emulator.metadata });
    emulator.loadProgram(new Uint8Array([0xa9, 0x42, 0x8d, 0x00, 0x02, 0x00]));
    emulator.reset();
    emulator.runFrame();

    expect(emulator.snapshot().memory[0x0200]).toBe(0x42);
  });

  it("supports controller input and deterministic state restore", () => {
    const emulator = new NESEmulator();
    emulator.start({ emulator: emulator.metadata });
    emulator.getController().setButtons(NES_BUTTON.A | NES_BUTTON.START);

    expect(emulator.getController().read()).toBe(NES_BUTTON.A | NES_BUTTON.START);

    const before = emulator.snapshot();
    emulator.runFrame();
    emulator.restore(before);

    expect(emulator.snapshot().pc).toBe(before.pc);
    expect(emulator.snapshot().memory).toEqual(before.memory);
  });

  it("exposes the reference emulator through an independent adapter", () => {
    const adapter = new NESAdapter();
    expect(adapter.supports("nes")).toBe(true);
    expect(adapter.supports("snes")).toBe(false);
    expect(adapter.create({} as never)).toBeInstanceOf(NESEmulator);
  });
});
