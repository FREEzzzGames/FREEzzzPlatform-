import { describe, expect, it } from "vitest";
import { EventBus } from "../../event-bus/event-bus";

type Events = {
  ready: { id: string };
  score: number;
};

describe("Event Bus stage 6", () => {
  it("subscribes and emits typed events", () => {
    const bus = new EventBus<Events>();
    const received: string[] = [];
    bus.on("ready", payload => received.push(payload.id));
    bus.emit("ready", { id: "core-1" });
    expect(received).toEqual(["core-1"]);
  });

  it("supports unsubscribe", () => {
    const bus = new EventBus<Events>();
    let count = 0;
    const subscription = bus.on("score", () => count++);
    bus.emit("score", 10);
    subscription.unsubscribe();
    bus.emit("score", 20);
    expect(count).toBe(1);
    expect(bus.listenerCount()).toBe(0);
  });

  it("does not retain empty event channels", () => {
    const bus = new EventBus<Events>();
    const sub = bus.on("ready", () => {});
    expect(bus.listenerCount("ready")).toBe(1);
    sub.unsubscribe();
    expect(bus.listenerCount("ready")).toBe(0);
  });
});
