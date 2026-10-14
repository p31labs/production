// Type declaration for the pre-compiled CBS WASM module.
// wrangler's [[rules]] type = "CompiledWasm" turns `import x from
// './taler_cs.wasm'` into a WebAssembly.Module binding at build time;
// this declaration keeps `tsc --noEmit` green.
declare module '*.wasm' {
  const mod: WebAssembly.Module;
  export default mod;
}