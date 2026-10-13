# Plan
1. Core pure modules (schema, slots, quota, backoff, crypto) with unit tests.
2. Store interface: an in-memory implementation for tests and a Postgres one for production.
3. YouTube/Drive seam (`YouTubeApi`, `DriveLister`) and the worker, tested with mocks.
4. Hono app (API, OAuth, UI) and the process entrypoint with the tick loop.
5. Dockerfile, docker-compose, Render blueprint, and README with Google Cloud and deploy steps.
