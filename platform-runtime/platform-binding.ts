import type { PlatformHostTarget } from "../platform-host/platform-host";
import { UnifiedPlatformRuntime } from "./platform-runtime";
import type { TargetStorageAdapter } from "../storage/platform-storage";

export interface PlatformBinding { readonly runtime:UnifiedPlatformRuntime; readonly storage:TargetStorageAdapter; readonly target:PlatformHostTarget; }

export class PlatformRuntimeBinding {
  constructor(private readonly runtime:UnifiedPlatformRuntime, private readonly storage:TargetStorageAdapter) {
    if ((runtime.getState().target==="android" && storage.target!=="android-native") || (runtime.getState().target==="web" && storage.target!=="web") || (runtime.getState().target==="telegram" && storage.target!=="telegram")) {
      throw new Error("Platform runtime target and storage target must match.");
    }
  }
  start():void{this.runtime.start();}
  stop():void{this.runtime.stop();}
  getBinding():PlatformBinding{return Object.freeze({runtime:this.runtime,storage:this.storage,target:this.runtime.getState().target});}
}
