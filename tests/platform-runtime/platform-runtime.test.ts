import {describe,expect,it} from "vitest";
import {UnifiedPlatformRuntime} from "../../platform-runtime/platform-runtime";
describe("UnifiedPlatformRuntime",()=>{it("uses the same target contract for web android and telegram",()=>{for(const target of ["web","android","telegram"] as const){const runtime=new UnifiedPlatformRuntime(target);runtime.start();expect(runtime.getState().status).toBe("ready");expect(runtime.supports("game")).toBe(true);runtime.stop();expect(runtime.getState().status).toBe("stopped");}});});
