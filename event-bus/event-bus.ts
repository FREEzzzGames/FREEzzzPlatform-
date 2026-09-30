export interface EventMap {
  readonly [event: string]: unknown;
}

export type EventHandler<T> = (payload: T) => void;

export interface EventSubscription {
  readonly event: string;
  unsubscribe(): void;
}

export class EventBus<E extends EventMap = EventMap> {
  private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();

  on<K extends keyof E & string>(event: K, handler: EventHandler<E[K]>): EventSubscription {
    const set = this.handlers.get(event) ?? new Set<EventHandler<unknown>>();
    set.add(handler as EventHandler<unknown>);
    this.handlers.set(event, set);
    return {
      event,
      unsubscribe: () => {
        set.delete(handler as EventHandler<unknown>);
        if (set.size === 0) this.handlers.delete(event);
      }
    };
  }

  emit<K extends keyof E & string>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) handler(payload);
  }

  listenerCount(event?: keyof E & string): number {
    if (event !== undefined) return this.handlers.get(event)?.size ?? 0;
    let total = 0;
    for (const set of this.handlers.values()) total += set.size;
    return total;
  }

  clear(): void {
    this.handlers.clear();
  }
}
