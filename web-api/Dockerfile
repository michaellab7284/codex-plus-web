# Stage 1: Build the Rust API binary
FROM rust:1.96-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace, core crates, and assets (needed for include_str! macros)
COPY Cargo.toml Cargo.lock* ./
COPY CodexPlusPlus/crates/codex-plus-core ./CodexPlusPlus/crates/codex-plus-core
COPY CodexPlusPlus/crates/codex-plus-data ./CodexPlusPlus/crates/codex-plus-data
COPY CodexPlusPlus/assets ./CodexPlusPlus/assets
COPY web-api ./web-api

# Build the API binary
RUN cargo build -p web-api --release

# Stage 2: Runtime image
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary
COPY --from=builder /app/target/release/web-api /app/web-api

# Create data directory
RUN mkdir -p /data

# Expose API port
EXPOSE 39901

# Environment variables
ENV API_HOST=0.0.0.0
ENV API_PORT=39901
ENV CODEX_PLUS_DATA_DIR=/data
# Match Codex config mount point (install.sh mounts host ~/.codex to /root/.codex)
ENV CODEX_HOME=/root/.codex

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:39901/api/health || exit 1

ENTRYPOINT ["/app/web-api"]
