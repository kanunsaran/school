// Backend URL: set VITE_API_URL at build time (Docker uses /api); defaults to localhost:3000 for npm run dev
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
