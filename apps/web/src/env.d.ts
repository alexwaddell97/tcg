/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    isElectron: () => Promise<boolean>
    getVersion: () => Promise<string>
  }
}

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
