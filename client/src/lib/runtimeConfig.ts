/**
 * Browser-local mode defaults to enabled to keep user data in-browser only.
 * Set VITE_BROWSER_LOCAL_ONLY=false to opt into external integrations.
 */
export const BROWSER_LOCAL_ONLY = import.meta.env.VITE_BROWSER_LOCAL_ONLY !== "false";
