export type ConfigPrimitive = string | number | boolean | null;
export type ConfigValue = ConfigPrimitive | ConfigPrimitive[] | { readonly [key: string]: ConfigPrimitive | ConfigPrimitive[] };

export interface Configuration {
  get<T extends ConfigValue = ConfigValue>(key: string): T | undefined;
  require<T extends ConfigValue = ConfigValue>(key: string): T;
  has(key: string): boolean;
  set<T extends ConfigValue>(key: string, value: T): void;
  delete(key: string): boolean;
  keys(): readonly string[];
}

export class ConfigStore implements Configuration {
  private readonly values = new Map<string, ConfigValue>();

  constructor(initial: Readonly<Record<string, ConfigValue>> = {}) {
    for (const [key, value] of Object.entries(initial)) this.set(key, value);
  }

  get<T extends ConfigValue = ConfigValue>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  require<T extends ConfigValue = ConfigValue>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) throw new Error(`Configuration key "${key}" is not defined.`);
    return value;
  }

  has(key: string): boolean { return this.values.has(key); }
  set<T extends ConfigValue>(key: string, value: T): void {
    if (!key.trim()) throw new Error("Configuration key must not be empty.");
    this.values.set(key, value);
  }
  delete(key: string): boolean { return this.values.delete(key); }
  keys(): readonly string[] { return [...this.values.keys()]; }
}
