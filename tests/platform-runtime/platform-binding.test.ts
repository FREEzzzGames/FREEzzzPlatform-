import {describe,expect,it} from "vitest";
import {UnifiedPlatformRuntime} from "../../platform-runtime/platform-runtime";
import {PlatformRuntimeBinding} from "../../platform-runtime/platform-binding";
import {MemoryTargetStorageAdapter} from "../../storage/platform-storage";
describe("PlatformRuntimeBinding",()=>{it("rejects mismatched target storage",()=>expect(()=>new PlatformRuntimeBinding(new UnifiedPlatformRuntime("android"),new MemoryTargetStorageAdapter("web"))).toThrow("must match"));it("binds web runtime to web storage",()=>{const runtime=new UnifiedPlatformRuntime("web");const binding=new PlatformRuntimeBinding(runtime,new MemoryTargetStorageAdapter("web"));binding.start();expect(binding.getBinding().target).toBe("web");});});
