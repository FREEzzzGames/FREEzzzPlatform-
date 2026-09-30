import type { PlatformHostTarget } from "../platform-host/platform-host";
import { PlatformTargetRegistry, type PlatformTargetDescriptor } from "../platform-target/platform-target";

export interface PlatformRuntimeState { readonly target:PlatformHostTarget; readonly runtimeId:string; readonly status:"created"|"ready"|"stopped"; readonly capabilities:readonly string[]; }
export class UnifiedPlatformRuntime {
  private status:PlatformRuntimeState["status"]="created";
  private descriptor:PlatformTargetDescriptor;
  constructor(target:PlatformHostTarget,private readonly targets=new PlatformTargetRegistry()){this.descriptor=targets.require(target);}
  start():void{if(this.status==="ready")return;this.status="ready";}
  stop():void{this.status="stopped";}
  getState():PlatformRuntimeState{return Object.freeze({target:this.descriptor.target,runtimeId:this.descriptor.runtimeId,status:this.status,capabilities:this.descriptor.capabilities});}
  supports(capability:string):boolean{return this.descriptor.capabilities.includes(capability);}
}
