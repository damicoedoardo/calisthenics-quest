# Built and pushed to ghcr.io/damicoedoardo/forma-api by .github/workflows/deploy-backend.yml on
# every backend change that lands on main; the server pulls new images on its own
# (scripts/deploy/README.md). Same shape as minlit's.
FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app/ ./app/

# --no-sync: everything is installed at build time, so a restart never needs PyPI.
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
