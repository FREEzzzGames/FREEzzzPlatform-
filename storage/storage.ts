export type StorageValue = string | number | boolean | null | Uint8Array;
export interface Storage { get(key:string):StorageValue|undefined; set(key:string,value:StorageValue):void; has(key:string):boolean; delete(key:string):boolean; keys():readonly string[]; clear():void; }
export interface StorageAdapter { readonly id:string; readonly version:string; create():Storage; }
export class MemoryStorage implements Storage {
  private readonly values=new Map<string,StorageValue>();
  get(key:string){return this.values.get(key);}
  set(key:string,value:StorageValue){if(!key.trim())throw new Error("Storage key must not be empty.");this.values.set(key,value);}
  has(key:string){return this.values.has(key);}
  delete(key:string){return this.values.delete(key);}
  keys(){return [...this.values.keys()];}
  clear(){this.values.clear();}
}
export class MemoryStorageAdapter implements StorageAdapter { readonly id="memory"; readonly version="1.0.0"; create():Storage{return new MemoryStorage();} }