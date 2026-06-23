#!/usr/bin/env bash
# =============================================================================
# Codex++ Web — 一键部署/卸载/管理脚本
# 兼容: Ubuntu/Debian, CentOS/RHEL, Fedora, Arch Linux, Alpine, openSUSE
# 用法:
#   bash install.sh         交互式菜单
#   bash install.sh install  静默安装
#   bash install.sh uninstall 静默卸载
#   bash install.sh status   查看状态
# =============================================================================
set -euo pipefail

# ── 颜色定义 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── 项目配置 ──
REPO_URL="https://github.com/michaellab7284/codex-plus-web.git"
INSTALL_DIR="${INSTALL_DIR:-/opt/codex-plus-web}"
COMPOSE_FILE="${INSTALL_DIR}/docker-compose.yml"
ENV_FILE="${INSTALL_DIR}/.env"
SERVICE_NAME="codex-plus-web"
GIT_BRANCH="main"

# ── 检测系统信息 ──
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="${ID}"
        OS_VERSION="${VERSION_ID}"
        OS_NAME="${NAME}"
    elif command -v lsb_release &>/dev/null; then
        OS_ID=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        OS_VERSION=$(lsb_release -sr)
        OS_NAME=$(lsb_release -sd)
    else
        OS_ID="unknown"
        OS_VERSION="unknown"
        OS_NAME="Unknown Linux"
    fi
    echo -e "${CYAN}检测到系统: ${OS_NAME} ${OS_VERSION}${NC}"
}

# ── 检查命令是否存在 ──
check_cmd() {
    command -v "$1" &>/dev/null
}

# ── 安装依赖 ──
install_deps() {
    echo -e "${BLUE}[*] 检查系统依赖...${NC}"

    local needs_install=false
    for cmd in docker git curl; do
        if ! check_cmd "$cmd"; then
            echo -e "${YELLOW}  缺少: ${cmd}${NC}"
            needs_install=true
        fi
    done

    if ! check_cmd docker compose && ! check_cmd docker-compose; then
        echo -e "${YELLOW}  缺少: docker compose${NC}"
        needs_install=true
    fi

    if [ "$needs_install" = false ]; then
        echo -e "${GREEN}  ✓ 所有依赖已满足${NC}"
        return 0
    fi

    echo -e "${BLUE}[*] 正在安装依赖...${NC}"

    case "${OS_ID}" in
        ubuntu|debian|linuxmint|pop)
            apt-get update -qq
            apt-get install -y -qq curl git docker.io docker-compose-v2 2>/dev/null || \
            apt-get install -y -qq curl git docker.io
            systemctl enable --now docker 2>/dev/null || true
            ;;
        centos|rhel|fedora|rocky|almalinux)
            if command -v dnf &>/dev/null; then
                dnf install -y curl git docker docker-compose-plugin
            else
                yum install -y curl git docker docker-compose-plugin
            fi
            systemctl enable --now docker 2>/dev/null || true
            ;;
        arch|manjaro|endeavouros)
            pacman -Sy --noconfirm curl git docker docker-compose
            systemctl enable --now docker 2>/dev/null || true
            ;;
        alpine)
            apk add curl git docker docker-compose
            rc-update add docker boot && service docker start 2>/dev/null || true
            ;;
        opensuse*|suse)
            zypper install -y curl git docker docker-compose
            systemctl enable --now docker 2>/dev/null || true
            ;;
        *)
            echo -e "${RED}✗ 未识别的系统: ${OS_ID}${NC}"
            echo -e "${YELLOW}  请手动安装: curl, git, docker, docker compose${NC}"
            exit 1
            ;;
    esac
    echo -e "${GREEN}  ✓ 依赖安装完成${NC}"
}

# ── 克隆/更新代码 ──
clone_repo() {
    if [ -d "${INSTALL_DIR}/.git" ]; then
        echo -e "${BLUE}[*] 更新代码库...${NC}"
        cd "${INSTALL_DIR}"
        git fetch origin
        git checkout "${GIT_BRANCH}"
        git pull origin "${GIT_BRANCH}"
    else
        echo -e "${BLUE}[*] 克隆代码库...${NC}"
        mkdir -p "$(dirname "${INSTALL_DIR}")"
        git clone --depth 1 --branch "${GIT_BRANCH}" "${REPO_URL}" "${INSTALL_DIR}"
        cd "${INSTALL_DIR}"
    fi
    echo -e "${GREEN}  ✓ 代码库已更新到最新版${NC}"
}

# ── 创建环境配置 ──
setup_env() {
    if [ ! -f "${ENV_FILE}" ]; then
        echo -e "${BLUE}[*] 创建环境配置...${NC}"
        cat > "${ENV_FILE}" <<-EOF
# Codex++ Web 环境配置
# 按需修改以下值
RUST_LOG=info
CODEX_HOME=${CODEX_HOME:-~/.codex}
CODEX_STATE=${CODEX_STATE:-~/.codex-session-delete}
EOF
        echo -e "${GREEN}  ✓ 已创建 ${ENV_FILE}${NC}"
    else
        echo -e "${GREEN}  ✓ 环境配置已存在${NC}"
    fi
}

# ── 启动服务 ──
start_service() {
    echo -e "${BLUE}[*] 启动 Codex++ Web 服务...${NC}"
    cd "${INSTALL_DIR}"
    docker compose up -d --build 2>&1 || docker-compose up -d --build 2>&1
    echo -e "${GREEN}  ✓ 服务已启动${NC}"
    show_status
}

# ── 停止服务 ──
stop_service() {
    echo -e "${BLUE}[*] 停止 Codex++ Web 服务...${NC}"
    cd "${INSTALL_DIR}" 2>/dev/null || true
    docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
    echo -e "${GREEN}  ✓ 服务已停止${NC}"
}

# ── 安装 systemd 服务 ──
install_systemd() {
    if ! command -v systemctl &>/dev/null; then
        echo -e "${YELLOW}  ⚠ systemd 不可用, 跳过服务注册${NC}"
        return
    fi

    echo -e "${BLUE}[*] 注册 systemd 服务...${NC}"
    cat > /etc/systemd/system/${SERVICE_NAME}.service <<-EOF
[Unit]
Description=Codex++ Web - LLM Provider Management
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStartPre=-/usr/bin/docker compose -f ${COMPOSE_FILE} pull
ExecStart=/usr/bin/docker compose -f ${COMPOSE_FILE} up -d
ExecStop=/usr/bin/docker compose -f ${COMPOSE_FILE} down
ExecReload=/usr/bin/docker compose -f ${COMPOSE_FILE} restart
StandardOutput=journal
StandardError=journal
User=root

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable ${SERVICE_NAME}
    echo -e "${GREEN}  ✓ systemd 服务已注册 (${SERVICE_NAME})${NC}"
}

# ── 安装主流程 ──
do_install() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Codex++ Web 安装程序${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    detect_os
    install_deps
    clone_repo
    setup_env
    start_service
    install_systemd

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ Codex++ Web 安装完成!${NC}"
    echo -e "${GREEN}   访问: http://localhost${NC}"
    echo -e "${GREEN}   API:  http://localhost:39901${NC}"
    echo -e "${GREEN}   日志: docker compose -f ${COMPOSE_FILE} logs -f${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
}

# ── 卸载流程 ──
do_uninstall() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo -e "${YELLOW}   Codex++ Web 卸载程序${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo ""

    # 确认
    echo -n -e "${RED}确认卸载? 将删除容器和镜像 (数据卷保留) [y/N]: ${NC}"
    read -r confirm
    if [ "${confirm}" != "y" ] && [ "${confirm}" != "Y" ]; then
        echo -e "${YELLOW}  取消卸载${NC}"
        return
    fi

    # 停止并删除容器
    echo -e "${BLUE}[*] 停止并删除容器...${NC}"
    if [ -f "${COMPOSE_FILE}" ]; then
        cd "${INSTALL_DIR}" 2>/dev/null && docker compose down -v 2>/dev/null || true
    fi

    # 删除镜像
    echo -e "${BLUE}[*] 删除 Docker 镜像...${NC}"
    docker rmi ghcr.io/michaellab7284/codex-plus-web-api:latest 2>/dev/null || true
    docker rmi ghcr.io/michaellab7284/codex-plus-web-web:latest 2>/dev/null || true

    # 删除 systemd 服务
    if command -v systemctl &>/dev/null; then
        echo -e "${BLUE}[*] 删除 systemd 服务...${NC}"
        systemctl stop ${SERVICE_NAME} 2>/dev/null || true
        systemctl disable ${SERVICE_NAME} 2>/dev/null || true
        rm -f /etc/systemd/system/${SERVICE_NAME}.service
        systemctl daemon-reload
    fi

    # 删除代码目录（可选）
    echo -n -e "${YELLOW}删除代码目录 ${INSTALL_DIR}? [y/N]: ${NC}"
    read -r del_dir
    if [ "${del_dir}" = "y" ] || [ "${del_dir}" = "Y" ]; then
        rm -rf "${INSTALL_DIR}"
        echo -e "${GREEN}  ✓ 已删除 ${INSTALL_DIR}${NC}"
    fi

    echo ""
    echo -e "${GREEN}  ✅ 卸载完成 (数据卷已保留, 如需彻底删除请手动清理 volumes)${NC}"
    echo -e "${GREEN}     docker volume ls | grep codex-plus${NC}"
}

# ── 查看状态 ──
do_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Codex++ Web 状态${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    # 系统信息
    detect_os
    echo "  安装目录: ${INSTALL_DIR}"
    echo ""

    # Docker 状态
    if check_cmd docker; then
        echo -e "${BLUE} Docker:${NC}"
        docker ps --filter "name=codex-plus" --format "  ▸ {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
        echo "  未运行"
    else
        echo -e "${YELLOW} Docker: 未安装${NC}"
    fi
    echo ""

    # 服务状态
    if command -v systemctl &>/dev/null; then
        echo -e "${BLUE} Systemd 服务:${NC}"
        systemctl is-active ${SERVICE_NAME} &>/dev/null && \
            echo -e "  ${GREEN}✓ ${SERVICE_NAME} (active)${NC}" || \
            echo -e "  ${YELLOW}⚠ ${SERVICE_NAME} (inactive)${NC}"
    fi
    echo ""

    # 健康检查
    if check_cmd curl; then
        echo -e "${BLUE} HTTP 健康检查:${NC}"
        if curl -sf http://localhost:39901/api/health >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓ API 服务正常 (port 39901)${NC}"
        else
            echo -e "  ${YELLOW}⚠ API 服务未响应${NC}"
        fi
        if curl -sf http://localhost:80 >/dev/null 2>&1 || curl -sf http://localhost >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓ Web 服务正常 (port 80)${NC}"
        else
            echo -e "  ${YELLOW}⚠ Web 服务未响应${NC}"
        fi
    fi
    echo ""
    echo -e "${CYAN}───────────────────────────────────────────${NC}"
}

# ── 更新流程 ──
do_update() {
    echo ""
    echo -e "${BLUE}[*] 更新 Codex++ Web...${NC}"
    clone_repo
    echo -e "${BLUE}[*] 重新构建并启动...${NC}"
    cd "${INSTALL_DIR}"
    docker compose up -d --build 2>&1 || docker-compose up -d --build 2>&1
    echo -e "${GREEN}  ✓ 更新完成${NC}"
    show_status
}

# ── 菜单 ──
show_menu() {
    clear
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        Codex++ Web 管理菜单              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} 一键安装 (Install)"
    echo -e "  ${YELLOW}2.${NC} 一键卸载 (Uninstall)"
    echo -e "  ${BLUE}3.${NC} 查看状态 (Status)"
    echo -e "  ${CYAN}4.${NC} 更新升级 (Update)"
    echo -e "  ${RED}5.${NC} 退出 (Exit)"
    echo ""
    echo -n "  请选择 [1-5]: "
    read -r choice
    echo ""

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
    # 需要 root 权限
    if [ "$(id -u)" -ne 0 ]; then
        echo -e "${YELLOW}⚠ 建议以 root 权限运行此脚本以避免权限问题${NC}"
        echo -e "${YELLOW}   bash <(curl -sL ${REPO_URL})${NC}"
        echo ""
    fi

    case "${1:-}" in
        install)   do_install ;;
        uninstall) do_uninstall ;;
        status)    do_status ;;
        update)    do_update ;;
        --help|-h)
            echo "用法: bash install.sh [选项]"
            echo "  选项:"
            echo "    install    一键安装"
            echo "    uninstall  一键卸载"
            echo "    status     查看状态"
            echo "    update     更新升级"
            echo "    (无参数)   交互式菜单"
            ;;
        *) show_menu ;;
    esac
}

main "$@"
