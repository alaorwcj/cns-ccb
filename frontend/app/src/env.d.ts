/// <reference types="vite/client" />

// Fallback declaration for editors that don't have @types/react installed
// This provides a permissive IntrinsicElements so JSX elements don't error
// when the workspace/IDE TypeScript server can't resolve react types.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

export {}
