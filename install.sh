#!/usr/bin/env bash
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
GHCR="ghcr.io/michaellab7284"
API_IMAGE="${GHCR}/codex-plus-web-api:latest"
WEB_IMAGE="${GHCR}/codex-plus-web-web:latest"
NETWORK="codex-plus"
API_CONTAINER="api"
WEB_CONTAINER="web"
API_PORT="${API_PORT:-39901}"
WEB_PORT="${WEB_PORT:-39900}"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"
CODEX_STATE="${CODEX_STATE:-${HOME}/.codex-session-delete}"
DATA_DIR="${DATA_DIR:-/tmp/codex-plus-data}"

detect_os() {
    if [ -f /etc/os-release ]; then . /etc/os-release; OS_ID="${ID}"; OS_NAME="${NAME}"
    elif command -v lsb_release &>/dev/null; then OS_ID=$(lsb_release -si | tr '[:upper:]' '[:lower:]'); OS_NAME=$(lsb_release -sd)
    else OS_ID="unknown"; OS_NAME="Unknown"; fi
    echo -e "${CYAN}系统: ${OS_NAME}${NC}"
}

install_docker() {
    if command -v docker &>/dev/null; then echo -e "${GREEN}  ✓ Docker 已安装${NC}"; return; fi
    echo -e "${BLUE}[*] 安装 Docker...${NC}"
    case "${OS_ID}" in
        ubuntu|debian|linuxmint|pop|centos|rhel|fedora|rocky|almalinux) curl -fsSL https://get.docker.com | bash ;;
        arch|manjaro) pacman -Sy --noconfirm docker; systemctl enable --now docker 2>/dev/null || true ;;
        alpine) apk add docker; rc-update add docker boot && service docker start 2>/dev/null || true ;;
        opensuse*) zypper install -y docker; systemctl enable --now docker 2>/dev/null || true ;;
        *) echo -e "${RED}✗ 请手动安装 Docker${NC}"; exit 1 ;;
    esac
    echo -e "${GREEN}  ✓ Docker 安装完成${NC}"
}

pull_images() { docker pull "${API_IMAGE}" && docker pull "${WEB_IMAGE}" && echo -e "${GREEN}  ✓ 镜像拉取完成${NC}"; }
ensure_network() { if ! docker network inspect "${NETWORK}" &>/dev/null; then docker network create "${NETWORK}"; fi; }

do_install() {
    echo ""; echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Codex++ Web 一键安装${NC}"
    echo -e "${CYAN}   端口: Web=${WEB_PORT}  API=${API_PORT}${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"; echo ""
    detect_os; install_docker; pull_images; ensure_network
    docker rm -f "${API_CONTAINER}" "${WEB_CONTAINER}" 2>/dev/null || true
    mkdir -p "${DATA_DIR}" "${CODEX_HOME}" "${CODEX_STATE}"

    # Detect Codex binary and mount it
    local CODEX_MOUNT=""
    for bin in /usr/bin/codex /usr/local/bin/codex; do
        if [ -x "$bin" ]; then echo -e "${GREEN}  ✓ 检测到 Codex: ${bin}${NC}"; CODEX_MOUNT="-v ${bin}:/usr/bin/codex:ro"; break; fi
    done
    [ -z "$CODEX_MOUNT" ] && echo -e "${YELLOW}  ⚠ 未检测到 Codex 二进制${NC}"

    echo -e "${BLUE}[*] 启动 API 容器...${NC}"
    docker run -d --name "${API_CONTAINER}" --network "${NETWORK}" --restart unless-stopped \
        -p "${API_PORT}:39901" \
        -e API_HOST=0.0.0.0 -e API_PORT=39901 -e CODEX_PLUS_DATA_DIR=/data \
        -e RUST_LOG="${RUST_LOG:-info}" \
        -v "${CODEX_HOME}:/root/.codex" -v "${CODEX_STATE}:/root/.codex-session-delete" -v "${DATA_DIR}:/data" \
        ${CODEX_MOUNT} \
        "${API_IMAGE}"

    echo -e "${YELLOW}  ⏳ 等待 API 就绪...${NC}"
    for i in $(seq 1 15); do curl -sf "http://localhost:${API_PORT}/api/health" &>/dev/null && { echo -e "${GREEN}  ✓ API 就绪${NC}"; break; }; sleep 1; done

    echo -e "${BLUE}[*] 启动 Web 容器...${NC}"
    docker run -d --name "${WEB_CONTAINER}" --network "${NETWORK}" --restart unless-stopped -p "${WEB_PORT}:39900" "${WEB_IMAGE}"

    echo ""; echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ 安装完成! 访问: http://localhost:${WEB_PORT}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
}

do_uninstall() {
    echo ""; echo -e "${YELLOW}   卸载 Codex++ Web${NC}"
    echo -n -e "${RED}确认卸载? [y/N]: ${NC}"; read -r confirm
    [ "${confirm}" != "y" ] && [ "${confirm}" != "Y" ] && { echo -e "${YELLOW}取消${NC}"; return; }
    docker rm -f "${API_CONTAINER}" "${WEB_CONTAINER}" 2>/dev/null || true
    docker rmi "${API_IMAGE}" "${WEB_IMAGE}" 2>/dev/null || true
    docker network rm "${NETWORK}" 2>/dev/null || true
    echo -e "${GREEN}  ✓ 卸载完成${NC}"
}

do_status() {
    echo ""; detect_os
    echo -e "${BLUE}容器:${NC}"; docker ps --filter name="${API_CONTAINER}" --filter name="${WEB_CONTAINER}" --format "  {{.Names}} {{.Status}}" 2>/dev/null || echo "  未运行"
    echo -e "${BLUE}健康:${NC}"
    curl -sf "http://localhost:${API_PORT}/api/health" &>/dev/null && echo -e "  ${GREEN}✓ API${NC}" || echo -e "  ${YELLOW}⚠ API${NC}"
    curl -sf "http://localhost:${WEB_PORT}" &>/dev/null && echo -e "  ${GREEN}✓ Web${NC}" || echo -e "  ${YELLOW}⚠ Web${NC}"
}

do_update() { pull_images; docker rm -f "${API_CONTAINER}" "${WEB_CONTAINER}" 2>/dev/null || true; do_install; }

show_menu() {
    clear; echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     Codex++ Web 管理菜单                 ║${NC}"
    echo -e "${CYAN}║  镜像: ghcr.io (CI 自动构建)             ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    echo ""; echo -e "  ${GREEN}1.${NC} 安装"; echo -e "  ${YELLOW}2.${NC} 卸载"
    echo -e "  ${BLUE}3.${NC} 状态"; echo -e "  ${CYAN}4.${NC} 更新"; echo -e "  ${RED}5.${NC} 退出"
    echo ""; echo -n "  选择 [1-5]: "; read -r choice
    case "${choice}" in 1) do_install ;; 2) do_uninstall ;; 3) do_status ;; 4) do_update ;; 5) exit 0 ;; *) sleep 1; show_menu ;; esac
}

main() {
    [ "$(id -u)" -ne 0 ] && echo -e "${YELLOW}⚠ 建议以 root 运行${NC}"
    case "${1:-}" in
        install) do_install ;; uninstall) do_uninstall ;; status) do_status ;; update) do_update ;;
        *) show_menu ;;
    esac
}
main "$@"
