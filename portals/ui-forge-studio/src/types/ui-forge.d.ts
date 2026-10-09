declare module '@p31ca/ui-forge/src/*.mjs' {
  export const AXES: string[];
  export function runGate(reviews: any[], options?: any): any;
  export async function forge(spec: any, options?: any): Promise<any>;
  export function ground(spec: any, options?: any): any;
  export function shape(tree: any, options?: any): any;
  export function classifyAdmissibility(shaped: any[], grounded: any, options?: any): { admissible: any[]; inadmissible: any[] };
  export function scoreCandidate(tree: any, audit: any[], grounded: any): any;
  export function selectSurvivors(scored: any[], minDist?: number): { survivors: any[]; kills: any[] };
  export function retryFetch(url: any, options?: any, retry?: any): Promise<Response>;
}