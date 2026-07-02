import express, { NextFunction, Request, Response } from "express";
import os from "node:os";
import process from "node:process";

type StatusResponse = {
  status: "ok";
  servedBy: string;
  timestamp: string;
};

type HeavyResponse = StatusResponse & {
  load: number;
  checksum: number;
  durationMs: number;
};

type MetricsResponse = {
  servedBy: string;
  requestCount: number;
  uptimeSeconds: number;
  timestamp: string;
};

const app = express();
const port = Number(process.env.PORT || 3000);
const servedBy = os.hostname();

let requestCount = 0;

app.use((_req: Request, _res: Response, next: NextFunction) => {
  requestCount += 1;
  next();
});

app.get("/api/status", (_req: Request, res: Response<StatusResponse>) => {
  res.status(200).json({
    status: "ok",
    servedBy,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/heavy", (req: Request, res: Response<HeavyResponse>) => {
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

app.get("/api/metrics", (_req: Request, res: Response<MetricsResponse>) => {
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
