import type {
  Audio,
  CPU,
  Emulator,
  EmulatorAdapter,
  EmulatorComponents,
  EmulatorContext,
  EmulatorDiagnostics,
  EmulatorMetadata,
  EmulatorStatus,
  Input,
  Memory,
  Timing,
  Video
} from "../../emulator/emulator";
import type { StatefulEmulator } from "../../emulator/emulator";

export interface NESSnapshot {
  readonly pc: number;
  readonly a: number;
  readonly x: number;
  readonly y: number;
  readonly sp: number;
  readonly status: number;
  readonly cycles: number;
  readonly frameCounter: number;
  readonly timing: number;
  readonly memory: Uint8Array;
}

export interface NESController {
  readonly buttons: number;
  setButtons(buttons: number): void;
  read(): number;
}

export const NES_BUTTON = {
  A: 1 << 0,
  B: 1 << 1,
  SELECT: 1 << 2,
  START: 1 << 3,
  UP: 1 << 4,
  DOWN: 1 << 5,
  LEFT: 1 << 6,
  RIGHT: 1 << 7
} as const;

export class NESMemory implements Memory {
  readonly size = 0x10000;
  private readonly data = new Uint8Array(this.size);

  read(address: number, length = 1): Uint8Array {
    this.assertRange(address, length);
    return this.data.slice(address, address + length);
  }

  write(address: number, data: Uint8Array): void {
    this.assertRange(address, data.length);
    this.data.set(data, address);
  }

  readByte(address: number): number {
    this.assertRange(address, 1);
    return this.data[address];
  }

  writeByte(address: number, value: number): void {
    this.assertRange(address, 1);
    this.data[address] = value & 0xff;
  }

  snapshot(): Uint8Array {
    return this.data.slice();
  }

  restore(data: Uint8Array): void {
    if (data.length !== this.size) throw new Error("NES memory snapshot has an invalid size.");
    this.data.set(data);
  }

  private assertRange(address: number, length: number): void {
    if (!Number.isInteger(address) || !Number.isInteger(length) || address < 0 || length < 0 || address + length > this.size) {
      throw new RangeError("NES memory access is outside the 16-bit address space.");
    }
  }
}

export class NESControllerAdapter implements Input, NESController {
  buttons = 0;
  setButtons(buttons: number): void {
    this.buttons = buttons & 0xff;
  }
  poll(): readonly number[] {
    return [this.buttons];
  }
  read(): number {
    return this.buttons;
  }
}

export class NESFrameVideo implements Video {
  readonly width = 256;
  readonly height = 240;
  private readonly frame = new Uint8Array(this.width * this.height);
  private presented = 0;

  present(frame: Uint8Array): void {
    if (frame.length !== this.frame.length) throw new Error("NES frame has an invalid size.");
    this.frame.set(frame);
    this.presented += 1;
  }

  getFrame(): Uint8Array {
    return this.frame.slice();
  }

  getPresentedFrames(): number {
    return this.presented;
  }
}

export class NESAudioSink implements Audio {
  readonly sampleRate = 44100;
  private readonly queue: number[] = [];

  push(samples: Float32Array): void {
    for (const sample of samples) this.queue.push(sample);
  }

  drain(): Float32Array {
    const result = Float32Array.from(this.queue);
    this.queue.length = 0;
    return result;
  }
}

export class NESFixedTiming implements Timing {
  private time = 0;
  readonly frameMilliseconds = 1000 / 60;

  now(): number {
    return this.time;
  }

  wait(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError("Timing delay must be non-negative.");
    this.time += milliseconds;
  }

  advanceFrame(): void {
    this.time += this.frameMilliseconds;
  }

  setTime(time: number): void {
    if (!Number.isFinite(time) || time < 0) throw new RangeError("Timing value must be non-negative.");
    this.time = time;
  }
}

class NES6502 implements CPU {
  private pc = 0;
  private a = 0;
  private x = 0;
  private y = 0;
  private sp = 0xfd;
  private status = 0x24;
  private cycles = 0;

  constructor(private readonly memory: NESMemory) {}

  reset(): void {
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.sp = 0xfd;
    this.status = 0x24;
    this.cycles = 0;
    const lo = this.memory.readByte(0xfffc);
    const hi = this.memory.readByte(0xfffd);
    this.pc = (hi << 8) | lo;
  }

  step(): void {
    const opcode = this.fetch();
    switch (opcode) {
      case 0xea: this.cycles += 2; break;
      case 0xa9: this.a = this.fetch(); this.setZN(this.a); this.cycles += 2; break;
      case 0xa2: this.x = this.fetch(); this.setZN(this.x); this.cycles += 2; break;
      case 0xa0: this.y = this.fetch(); this.setZN(this.y); this.cycles += 2; break;
      case 0x8d: { const address = this.fetchWord(); this.memory.writeByte(address, this.a); this.cycles += 4; break; }
      case 0x8e: { const address = this.fetchWord(); this.memory.writeByte(address, this.x); this.cycles += 4; break; }
      case 0x8c: { const address = this.fetchWord(); this.memory.writeByte(address, this.y); this.cycles += 4; break; }
      case 0xe8: this.x = (this.x + 1) & 0xff; this.setZN(this.x); this.cycles += 2; break;
      case 0xca: this.x = (this.x - 1) & 0xff; this.setZN(this.x); this.cycles += 2; break;
      case 0xc8: this.y = (this.y + 1) & 0xff; this.setZN(this.y); this.cycles += 2; break;
      case 0x88: this.y = (this.y - 1) & 0xff; this.setZN(this.y); this.cycles += 2; break;
      case 0x69: this.a = (this.a + this.fetch() + (this.status & 1)) & 0xff; this.setZN(this.a); this.cycles += 2; break;
      case 0x29: this.a &= this.fetch(); this.setZN(this.a); this.cycles += 2; break;
      case 0x09: this.a |= this.fetch(); this.setZN(this.a); this.cycles += 2; break;
      case 0x49: this.a ^= this.fetch(); this.setZN(this.a); this.cycles += 2; break;
      case 0x4c: this.pc = this.fetchWord(); this.cycles += 3; break;
      case 0x00: this.cycles += 7; break;
      default: this.cycles += 2; break;
    }
  }

  snapshot(): Pick<NESSnapshot, "pc" | "a" | "x" | "y" | "sp" | "status" | "cycles"> {
    return { pc: this.pc, a: this.a, x: this.x, y: this.y, sp: this.sp, status: this.status, cycles: this.cycles };
  }

  restore(state: Pick<NESSnapshot, "pc" | "a" | "x" | "y" | "sp" | "status" | "cycles">): void {
    this.pc = state.pc & 0xffff;
    this.a = state.a & 0xff;
    this.x = state.x & 0xff;
    this.y = state.y & 0xff;
    this.sp = state.sp & 0xff;
    this.status = state.status & 0xff;
    this.cycles = state.cycles;
  }

  private fetch(): number {
    const value = this.memory.readByte(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    return value;
  }

  private fetchWord(): number {
    const lo = this.fetch();
    const hi = this.fetch();
    return (hi << 8) | lo;
  }

  private setZN(value: number): void {
    this.status = (this.status & 0x7d) | (value === 0 ? 0x02 : 0) | (value & 0x80 ? 0x80 : 0);
  }
}

export class NESEmulator implements StatefulEmulator {
  readonly metadata: EmulatorMetadata = Object.freeze({
    id: "nes",
    name: "NES Reference Emulator",
    version: "0.1.0"
  });

  private status: EmulatorStatus = "created";
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private error: Error | null = null;
  private readonly memory = new NESMemory();
  private readonly cpu = new NES6502(this.memory);
  readonly video = new NESFrameVideo();
  readonly audio = new NESAudioSink();
  readonly input = new NESControllerAdapter();
  readonly timing = new NESFixedTiming();
  private frameCounter = 0;

  start(_context: EmulatorContext): void {
    if (this.status === "running") return;
    if (this.status === "starting" || this.status === "stopping") throw new Error("NES emulator is busy.");
    this.status = "starting";
    this.error = null;
    try {
      this.cpu.reset();
      this.startedAt = this.timing.now();
      this.stoppedAt = null;
      this.status = "running";
    } catch (cause) {
      this.error = cause instanceof Error ? cause : new Error(String(cause));
      this.status = "failed";
      throw this.error;
    }
  }

  stop(): void {
    if (this.status === "created" || this.status === "stopped") return;
    if (this.status === "starting") throw new Error("NES emulator cannot stop while starting.");
    this.status = "stopping";
    this.stoppedAt = this.timing.now();
    this.status = "stopped";
  }

  reset(): void {
    if (this.status !== "running") throw new Error("NES emulator must be running.");
    this.cpu.reset();
    this.frameCounter = 0;
  }

  runFrame(): void {
    if (this.status !== "running") throw new Error("NES emulator must be running.");
    const targetCycles = 29780;
    const before = this.cpu.snapshot().cycles;
    while (this.cpu.snapshot().cycles - before < targetCycles) this.cpu.step();
    this.timing.advanceFrame();
    this.frameCounter += 1;
  }

  getStatus(): EmulatorStatus {
    return this.status;
  }

  getDiagnostics(): EmulatorDiagnostics {
    return {
      status: this.status,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      error: this.error
    };
  }

  loadProgram(program: Uint8Array, startAddress = 0x8000): void {
    this.memory.write(startAddress, program);
    this.memory.writeByte(0xfffc, startAddress & 0xff);
    this.memory.writeByte(0xfffd, (startAddress >>> 8) & 0xff);
  }

  snapshot(): NESSnapshot {
    return { ...this.cpu.snapshot(), frameCounter: this.frameCounter, timing: this.timing.now(), memory: this.memory.snapshot() };
  }

  restore(snapshot: NESSnapshot): void {
    if (!Number.isInteger(snapshot.frameCounter) || snapshot.frameCounter < 0) throw new Error("NES snapshot frame counter is invalid.");
    if (!Number.isFinite(snapshot.timing) || snapshot.timing < 0) throw new Error("NES snapshot timing is invalid.");
    this.memory.restore(snapshot.memory);
    this.cpu.restore(snapshot);
    this.frameCounter = snapshot.frameCounter;
    this.timing.setTime(snapshot.timing);
  }

  snapshotState(): Uint8Array {
    const snapshot = this.snapshot();
    return new TextEncoder().encode(JSON.stringify({ ...snapshot, memory: Array.from(snapshot.memory) }));
  }

  restoreState(data: Uint8Array): void {
    let value: NESSnapshot & { memory: number[] };
    try {
      value = JSON.parse(new TextDecoder().decode(data)) as NESSnapshot & { memory: number[] };
    } catch {
      throw new Error("NES emulator state is not valid JSON.");
    }
    if (!Number.isInteger(value.pc) || !Number.isInteger(value.a) || !Number.isInteger(value.x) ||
        !Number.isInteger(value.y) || !Number.isInteger(value.sp) || !Number.isInteger(value.status) ||
        !Number.isInteger(value.cycles) || !Number.isInteger(value.frameCounter) ||
        !Number.isFinite(value.timing) || !Array.isArray(value.memory)) {
      throw new Error("NES emulator state is invalid.");
    }
    const memory = Uint8Array.from(value.memory);
    if (memory.length !== this.memory.size) throw new Error("NES emulator state has an invalid memory size.");
    this.restore({ ...value, memory });
  }

  getFrameCounter(): number {
    return this.frameCounter;
  }

  getController(): NESControllerAdapter {
    return this.input;
  }
}

export class NESAdapter implements EmulatorAdapter {
  readonly id = "nes-reference";
  readonly version = "0.1.0";

  supports(emulatorId: string): boolean {
    return emulatorId === "nes";
  }

  create(_components: EmulatorComponents): Emulator {
    return new NESEmulator();
  }
}
