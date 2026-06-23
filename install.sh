#!/usr/bin/env bash
# =============================================================================
# Codex++ Web — 一键安装/卸载/管理脚本
# 镜像来源: ghcr.io (GitHub Actions 自动构建)
# 兼容: Ubuntu/Debian, CentOS/RHEL, Fedora, Arch, Alpine, openSUSE
# 用法:
#   bash install.sh          交互式菜单
#   bash install.sh install  安装
#   bash install.sh uninstall 卸载
#   bash install.sh status   状态
#   bash install.sh update   更新
# =============================================================================
set -euo pipefail

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── 镜像配置 (由 GitHub Actions 构建) ──
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

# ── 系统检测 ──
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="${ID}"; OS_NAME="${NAME}"
    elif command -v lsb_release &>/dev/null; then
        OS_ID=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        OS_NAME=$(lsb_release -sd)
    else
        OS_ID="unknown"; OS_NAME="Unknown"
    fi
    echo -e "${CYAN}系统: ${OS_NAME}${NC}"
}

check_cmd() { command -v "$1" &>/dev/null; }

# ── 安装 Docker ──
install_docker() {
    if check_cmd docker; then
        echo -e "${GREEN}  ✓ Docker 已安装${NC}"
        return
    fi
    echo -e "${BLUE}[*] 安装 Docker...${NC}"
    case "${OS_ID}" in
        ubuntu|debian|linuxmint|pop)
            curl -fsSL https://get.docker.com | bash
            ;;
        centos|rhel|fedora|rocky|almalinux)
            curl -fsSL https://get.docker.com | bash
            ;;
        arch|manjaro)
            pacman -Sy --noconfirm docker
            systemctl enable --now docker 2>/dev/null || true
            ;;
        alpine)
            apk add docker
            rc-update add docker boot && service docker start 2>/dev/null || true
            ;;
        opensuse*)
            zypper install -y docker
            systemctl enable --now docker 2>/dev/null || true
            ;;
        *)
            echo -e "${RED}✗ 请手动安装 Docker: https://docs.docker.com/engine/install/${NC}"
            exit 1
            ;;
    esac
    echo -e "${GREEN}  ✓ Docker 安装完成${NC}"
}

# ── 拉取镜像 ──
pull_images() {
    echo -e "${BLUE}[*] 拉取 API 镜像...${NC}"
    docker pull "${API_IMAGE}"
    echo -e "${BLUE}[*] 拉取 Web 镜像...${NC}"
    docker pull "${WEB_IMAGE}"
    echo -e "${GREEN}  ✓ 镜像拉取完成${NC}"
}

# ── 创建网络 ──
ensure_network() {
    if ! docker network inspect "${NETWORK}" &>/dev/null; then
        docker network create "${NETWORK}"
        echo -e "${GREEN}  ✓ 创建网络: ${NETWORK}${NC}"
    fi
}

# ── 启动 ──
do_install() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Codex++ Web 一键安装${NC}"
    echo -e "${CYAN}   镜像来源: ghcr.io (CI 自动构建)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    detect_os
    install_docker
    pull_images
    ensure_network

    # 清理旧容器
    docker rm -f "${API_CONTAINER}" "${WEB_CONTAINER}" 2>/dev/null || true

    # 创建数据目录
    mkdir -p "${DATA_DIR}" "${CODEX_HOME}" "${CODEX_STATE}"

    # 启动 API
    echo -e "${BLUE}[*] 启动 API 容器...${NC}"
    docker run -d \
        --name "${API_CONTAINER}" \
        --network "${NETWORK}" \
        --restart unless-stopped \
        -p "${API_PORT}:39901" \
        -e API_HOST=0.0.0.0 \
        -e API_PORT=39901 \
        -e CODEX_PLUS_DATA_DIR=/data \
        -e RUST_LOG="${RUST_LOG:-info}" \
        -v "${CODEX_HOME}:/root/.codex" \
        -v "${CODEX_STATE}:/root/.codex-session-delete" \
        -v "${DATA_DIR}:/data" \
        "${API_IMAGE}"

    # 等待 API 就绪
    echo -e "${YELLOW}  ⏳ 等待 API 就绪...${NC}"
    for i in $(seq 1 15); do
        if curl -sf "http://localhost:${API_PORT}/api/health" &>/dev/null; then
            echo -e "${GREEN}  ✓ API 就绪${NC}"
            break
        fi
        sleep 1
    done

    # 启动 Web 前端
    echo -e "${BLUE}[*] 启动 Web 容器...${NC}"
    docker run -d \
        --name "${WEB_CONTAINER}" \
        --network "${NETWORK}" \
        --restart unless-stopped \
        -p "${WEB_PORT}:39900" \
        "${WEB_IMAGE}"

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ 安装完成!${NC}"
    echo -e "${GREEN}   访问: http://localhost${NC}"
    echo -e "${GREEN}   API:  http://localhost:${API_PORT}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
}

# ── 卸载 ──
do_uninstall() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo -e "${YELLOW}   卸载 Codex++ Web${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo ""
    echo -n -e "${RED}确认卸载? (容器+镜像删除, 数据卷保留) [y/N]: ${NC}"
    read -r confirm
    [ "${confirm}" != "y" ] && [ "${confirm}" != "Y" ] && { echo -e "${YELLOW}取消${NC}"; return; }

    echo -e "${BLUE}[*] 停止并删除容器...${NC}"
    docker rm -f "${API_CONTAINER}" "${WEB_CONTAINER}" 2>/dev/null || true

    echo -e "${BLUE}[*] 删除镜像...${NC}"
    docker rmi "${API_IMAGE}" "${WEB_IMAGE}" 2>/dev/null || true

    echo -e "${BLUE}[*] 删除网络...${NC}"
    docker network rm "${NETWORK}" 2>/dev/null || true

    echo -e "${GREEN}  ✅ 卸载完成 (数据保留: ${DATA_DIR}, ${CODEX_HOME})${NC}"
}

# ── 状态 ──
do_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Codex++ Web 状态${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""
    detect_os

    echo -e "\n${BLUE}Docker 容器:${NC}"
    docker ps --filter "name=${API_CONTAINER}|${WEB_CONTAINER}" \
        --format "  ▸ {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  未运行"

    echo -e "\n${BLUE}健康检查:${NC}"
    if curl -sf "http://localhost:${API_PORT}/api/health" &>/dev/null; then
        echo -e "  ${GREEN}✓ API (:${API_PORT})${NC}"
    else
        echo -e "  ${YELLOW}⚠ API (:${API_PORT}) 未响应${NC}"
    fi
    if curl -sf "http://localhost:${WEB_PORT}" &>/dev/null; then
        echo -e "  ${GREEN}✓ Web (:${WEB_PORT})${NC}"
    else
        echo -e "  ${YELLOW}⚠ Web (:${WEB_PORT}) 未响应${NC}"
    fi
    echo ""
}

# ── 更新 ──
do_update() {
    echo ""
    echo -e "${BLUE}[*] 更新 Codex++ Web...${NC}"
    pull_images
    echo -e "${BLUE}[*] 重启容器...${NC}"
    docker rm -f "${API_CONTAINER}" "${WEB_CONTAINER}" 2>/dev/null || true
    do_install
}

# ── 菜单 ──
show_menu() {
    clear
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        Codex++ Web 管理菜单              ║${NC}"
    echo -e "${CYAN}║  镜像: ghcr.io (CI 自动构建)             ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} 一键安装"
    echo -e "  ${YELLOW}2.${NC} 一键卸载"
    echo -e "  ${BLUE}3.${NC} 查看状态"
    echo -e "  ${CYAN}4.${NC} 更新升级"
    echo -e "  ${RED}5.${NC} 退出"
    echo ""
    echo -n "  请选择 [1-5]: "
    read -r choice
    case "${choice}" in
        1) do_install ;;
        2) do_uninstall ;;
        3) do_status ;;
        4) do_update ;;
        5) echo -e "${GREEN}再见!${NC}"; exit 0 ;;
        *) echo -e "${RED}无效选择${NC}"; sleep 1; show_menu ;;
    esac
}

# ── 主入口 ──
main() {
    if [ "$(id -u)" -ne 0 ]; then
        echo -e "${YELLOW}⚠ 建议以 root 运行 (sudo)${NC}"
    fi
    case "${1:-}" in
        install)   do_install ;;
        uninstall) do_uninstall ;;
        status)    do_status ;;
        update)    do_update ;;
        --help|-h)
            echo "用法: bash install.sh [选项]"
            echo "  选项: install / uninstall / status / update"
            echo "  无参数: 交互式菜单"
            ;;
        *) show_menu ;;
    esac
}

main "$@"
