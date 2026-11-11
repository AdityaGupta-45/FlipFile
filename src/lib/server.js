// Some tools need the FlipFile conversion server (server/index.js).
// On a website without that server, those tools are shown as "coming soon".
export const SERVER_READY =
  !import.meta.env.PROD || Boolean(import.meta.env.VITE_API_URL) || import.meta.env.VITE_HAS_SERVER === "true";

export const isComingSoon = (tool) => Boolean(tool.server) && !SERVER_READY;