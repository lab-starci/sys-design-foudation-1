const express = require("express");
const os = require("os");

const app = express();
const port = Number(process.env.PORT || 3000);
const servedBy = os.hostname();

let requestCount = 0;

app.use((req, res, next) => {
  requestCount += 1;
  next();
});

app.get("/api/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    servedBy,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/heavy", (req, res) => {
  const rawLoad = Number(req.query.load || 100000);
  const load = Number.isFinite(rawLoad)
    ? Math.min(Math.max(Math.trunc(rawLoad), 0), 50000000)
    : 100000;

  const startedAt = process.hrtime.bigint();
  let checksum = 0;

  for (let i = 0; i < load; i += 1) {
    checksum = (checksum + ((i * 31) % 997)) % 1000000007;
  }

  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

  res.status(200).json({
    status: "ok",
    servedBy,
    load,
    checksum,
    durationMs: Number(durationMs.toFixed(3)),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/metrics", (req, res) => {
  res.status(200).json({
    servedBy,
    requestCount,
    uptimeSeconds: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString()
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ message: "status-service started", servedBy, port }));
});
