import app from "./app.js";

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Dispatch :${PORT}`);
  console.log(`  POST /api/auth/signup`);
  console.log(`  POST /api/auth/login`);
  console.log(`  POST /api/ask`);
  console.log(`  GET  /api/ask/stream`);
  console.log(`  GET  /api/feed`);
  console.log(`  GET  /api/tools/status`);
});
