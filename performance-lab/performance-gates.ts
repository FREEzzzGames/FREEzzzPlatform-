import type { PerformanceMetric, PerformanceLab } from "./performance-lab";
export interface PerformanceBudget{readonly metric:PerformanceMetric;readonly max?:number;readonly min?:number;}
export interface PerformanceGateResult{readonly passed:boolean;readonly failures:readonly string[];}
export function evaluatePerformanceBudgets(lab:PerformanceLab,budgets:readonly PerformanceBudget[]):PerformanceGateResult{
 const failures:string[]=[];
 for(const b of budgets){const s=lab.summarize(b.metric);if(!s)continue;if(b.max!==undefined&&s.max>b.max)failures.push(b.metric+" max "+s.max+" exceeds "+b.max);if(b.min!==undefined&&s.min<b.min)failures.push(b.metric+" min "+s.min+" below "+b.min);}
 return Object.freeze({passed:failures.length===0,failures:Object.freeze(failures)});
}
export function assertPerformanceBudgets(lab:PerformanceLab,budgets:readonly PerformanceBudget[]):void{const r=evaluatePerformanceBudgets(lab,budgets);if(!r.passed)throw new Error("Performance budget failed: "+r.failures.join("; "));}
