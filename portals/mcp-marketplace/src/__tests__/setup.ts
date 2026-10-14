import '@testing-library/jest-dom/vitest'
import React from 'react'

// The canon-v2 family (design-core) ships JSX without a React import
// (automatic runtime). Vitest's node_modules transform path compiles it
// with the classic runtime, which resolves the free `React` identifier
// from the global scope in sloppy mode — provide it. Test-only shim; the
// production build uses the automatic runtime and is unaffected.
;(globalThis as Record<string, unknown>).React = React