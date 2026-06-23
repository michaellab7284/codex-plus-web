# Stage 1: Build the React frontend
FROM node:22-alpine AS builder

WORKDIR /app
COPY web-ui/package.json web-ui/package-lock.json* ./
RUN npm ci
COPY web-ui/ .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 39900

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:39900 || exit 1

CMD ["nginx", "-g", "daemon off;"]
