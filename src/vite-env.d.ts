/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
declare const __APP_COMMIT_MSG__: string;

interface Window {
  // Set by /reset to suppress the visibilitychange autosave that otherwise
  // raced with the wipe and rewrote the cleared profile from memory.
  __resetting?: boolean;
}
