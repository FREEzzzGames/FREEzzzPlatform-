export type ConfigPrimitive = string | number | boolean | null;
export type ConfigValue = ConfigPrimitive | readonly ConfigPrimitive[] | { readonly [key: string]: ConfigPrimitive | readonly ConfigPrimitive[] };
export type ConfigSection = "platform" | "core" | "module" | "user" | "feature";

export interface Configuration {
  get<T extends ConfigValue = ConfigValue>(section: ConfigSection, key: string): T | undefined;
  require<T extends ConfigValue = ConfigValue>(section: ConfigSection, key: string): T;
  has(section: ConfigSection, key: string): boolean;
  set<T extends ConfigValue>(section: ConfigSection, key: string, value: T): void;
  delete(section: ConfigSection, key: string): boolean;
  keys(section: ConfigSection): readonly string[];
}

export class ConfigStore implements Configuration {
  private readonly sections = new Map<ConfigSection, Map<string, ConfigValue>>();
  constructor(initial: Partial<Record<ConfigSection, Readonly<Record<string, ConfigValue>>>> = {}) {
    for (const [section, values] of Object.entries(initial) as [ConfigSection, Readonly<Record<string, ConfigValue>>][]) {
      for (const [key, value] of Object.entries(values ?? {})) this.set(section, key, value);
    }
  }
  get<T extends ConfigValue = ConfigValue>(section: ConfigSection, key: string): T | undefined { return this.sections.get(section)?.get(key) as T | undefined; }
  require<T extends ConfigValue = ConfigValue>(section: ConfigSection, key: string): T {
    const value = this.get<T>(section, key);
    if (value === undefined) throw new Error(`Configuration "${section}.${key}" is not defined.`);
    return value;
  }
  has(section: ConfigSection, key: string): boolean { return this.sections.get(section)?.has(key) ?? false; }
  set<T extends ConfigValue>(section: ConfigSection, key: string, value: T): void {
    if (!key.trim()) throw new Error("Configuration key must not be empty.");
    const values = this.sections.get(section) ?? new Map<string, ConfigValue>();
    values.set(key, value);
    this.sections.set(section, values);
  }
  delete(section: ConfigSection, key: string): boolean {
    const values = this.sections.get(section);
    if (!values) return false;
    const deleted = values.delete(key);
    if (values.size === 0) this.sections.delete(section);
    return deleted;
  }
  keys(section: ConfigSection): readonly string[] { return [...(this.sections.get(section)?.keys() ?? [])]; }
}