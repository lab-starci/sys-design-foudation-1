# Status Service Load Balancing

## 1. Mo ta

Bai nay dung mot status service stateless bang TypeScript + Express, dat sau Nginx load balancer. Moi replica tra ve hostname rieng qua field `servedBy`, vi trong Docker `os.hostname()` la container ID nen co the dung lam fingerprint de quan sat phan tai.

Service lang nghe cong noi bo `3000` va cung cap 3 endpoint:

- `GET /api/status`: tra `{status, servedBy, timestamp}`
- `GET /api/heavy?load=`: tao CPU work co gioi han de test request nang
- `GET /api/metrics`: tra metric rieng cua tung instance `{servedBy, requestCount, uptimeSeconds, timestamp}`

## 2. Cach chay

Chay local:

```bash
npm install
npm run start:dev
curl http://localhost:3000/api/status
```

Build va chay compiled JavaScript tu TypeScript:

```bash
npm run build
npm start
```

Chay bang Docker Compose va scale 5 replica:

```bash
docker compose up -d --build --scale status-service=5
curl http://localhost:8080/api/status
```

Dung cum:

```bash
docker compose down
```

## 3. Kien truc / stack

```mermaid
flowchart LR
  C[Client] --> N[Nginx :8080 -> :80]
  N --> S1[status-service replica 1 :3000]
  N --> S2[status-service replica 2 :3000]
  N --> S3[status-service replica 3 :3000]
  N --> S4[status-service replica 4 :3000]
  N --> S5[status-service replica 5 :3000]
```

Stack:

- Node.js 20 + TypeScript + Express
- Docker multi-stage image
- Docker Compose scale
- Nginx `1.27-alpine`
- Docker embedded DNS resolver `127.0.0.11`

## 4. Smoke test

Local contract test:

```text
{"status":"ok","servedBy":"BETUANMINH","timestamp":"2026-07-02T10:34:21.310Z"}
{"status":"ok","servedBy":"BETUANMINH","load":1000,"checksum":496599,"durationMs":0.064,"timestamp":"2026-07-02T10:34:21.367Z"}
{"servedBy":"BETUANMINH","requestCount":3,"uptimeSeconds":2.095,"timestamp":"2026-07-02T10:34:21.371Z"}
```

Docker Compose sau khi scale 5 replica:

```text
[compose] 6 services:
  sys-desgin-foundation-1-nginx-1 (nginx:1.27-alpine) Up 7 seconds [8080, 8080]
  sys-desgin-foundation-1-status-service-1 (sys-desgin-foundation-1-status-service) Up 14 seconds (healthy) [3000/tcp]
  sys-desgin-foundation-1-status-service-2 (sys-desgin-foundation-1-status-service) Up 13 seconds (healthy) [3000/tcp]
  sys-desgin-foundation-1-status-service-3 (sys-desgin-foundation-1-status-service) Up 13 seconds (healthy) [3000/tcp]
  sys-desgin-foundation-1-status-service-4 (sys-desgin-foundation-1-status-service) Up 13 seconds (healthy) [3000/tcp]
  sys-desgin-foundation-1-status-service-5 (sys-desgin-foundation-1-status-service) Up 13 seconds (healthy) [3000/tcp]
```

Goi `/api/status` qua Nginx:

```text
1: 39617b1e370e 2026-07-02T10:34:04.673Z
2: 1376028f6c5d 2026-07-02T10:34:04.869Z
3: d0d4876d6d22 2026-07-02T10:34:05.002Z
4: 680fade0913b 2026-07-02T10:34:05.123Z
5: 282c26d0251d 2026-07-02T10:34:05.247Z
6: 39617b1e370e 2026-07-02T10:34:05.370Z
7: 39617b1e370e 2026-07-02T10:34:05.479Z
8: 282c26d0251d 2026-07-02T10:34:05.604Z
9: 39617b1e370e 2026-07-02T10:34:05.728Z
10: 39617b1e370e 2026-07-02T10:34:05.836Z
```

Goi `/api/metrics` qua Nginx:

```text
1: 282c26d0251d requestCount=2 uptimeSeconds=13.77
2: 282c26d0251d requestCount=3 uptimeSeconds=13.952
3: 282c26d0251d requestCount=4 uptimeSeconds=14.063
4: 282c26d0251d requestCount=5 uptimeSeconds=14.185
5: 39617b1e370e requestCount=3 uptimeSeconds=13.875
6: 680fade0913b requestCount=3 uptimeSeconds=13.83
7: 1376028f6c5d requestCount=3 uptimeSeconds=14.36
8: 39617b1e370e requestCount=6 uptimeSeconds=14.246
```

## 5. Giai thich phan tai

Nginx la entrypoint duy nhat tren host port `8080`. Request duoc proxy xuong `status-service:3000`.

Config Nginx dung:

```nginx
resolver 127.0.0.11 valid=1s ipv6=off;
set $backend "status-service:3000";
proxy_pass http://$backend;
```

`127.0.0.11` la Docker embedded DNS. Khi `status-service` duoc scale bang Compose, DNS name `status-service` tra ve nhieu dia chi container. Dung bien `$backend` lam Nginx resolve lai ten service theo resolver thay vi giu ket qua DNS dau tien qua lau. Output `/api/status` cho thay request di qua 5 `servedBy` khac nhau: `39617b1e370e`, `1376028f6c5d`, `d0d4876d6d22`, `680fade0913b`, `282c26d0251d`.

Metrics cung xac nhan counter nam trong tung process rieng: cung mot endpoint `/api/metrics`, nhung moi hostname co `requestCount` rieng va tang doc lap.

## 6. Design decisions

- Service stateless: khong ghi file, DB, session store hay shared memory.
- `servedBy = os.hostname()` de Docker container ID tro thanh instance fingerprint.
- Source viet bang TypeScript trong `src/index.ts`, production build ra `dist/index.js`.
- `requestCount` la bien trong process. Node.js xu ly JavaScript tren mot event loop, nen phep tang counter nay an toan trong pham vi mot instance va khong chia se giua replica.
- Dockerfile multi-stage chay `npm run build`, prune dev dependencies, va image runtime chi gom production dependencies + `dist`.
- Compose chi expose port `3000` trong network noi bo; host chi truy cap qua Nginx port `8080`.
- Healthcheck dung `/api/status` de Nginx chi start sau khi cac replica healthy.
