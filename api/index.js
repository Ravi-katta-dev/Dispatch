// Vercel serverless entry point.
// Imports the Express app and exports it as the default handler.
// Vercel wraps this automatically — no app.listen() needed.
import app from "../server/app.js";
export default app;
