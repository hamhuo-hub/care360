#!/usr/bin/env bash
# Care360 Dashboard — LAN deployment
#
# 生产模式（默认）：构建前端，通过 FastAPI 统一服务
#   ./start.sh
#
# 开发模式：热重载，前端 :5173 后端 :8000
#   ./start.sh --dev

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$DIR/backend/.venv"
PORT="${PORT:-8080}"
DEV_BACKEND_PORT="${DEV_BACKEND_PORT:-8000}"
DEV_FRONTEND_PORT="${DEV_FRONTEND_PORT:-5173}"

# 创建或复用虚拟环境
setup_venv() {
  if [[ ! -f "$VENV/bin/activate" ]]; then
    echo "==> 创建 Python 虚拟环境..."
    python3 -m venv "$VENV"
  fi
  source "$VENV/bin/activate"
  pip install -r "$DIR/backend/requirements.txt" -q
}

if [[ "${1:-}" == "--dev" ]]; then
  echo "==> 开发模式：后端 :${DEV_BACKEND_PORT}  前端 :${DEV_FRONTEND_PORT}"
  setup_venv

  cd "$DIR/backend"
  uvicorn main:app --host 0.0.0.0 --port "$DEV_BACKEND_PORT" --reload &
  BACKEND_PID=$!
  trap "kill $BACKEND_PID 2>/dev/null" EXIT

  cd "$DIR/frontend"
  npm install
  VITE_PORT=$DEV_FRONTEND_PORT npm run dev -- --port "$DEV_FRONTEND_PORT"
else
  echo "==> 构建前端..."
  cd "$DIR/frontend"
  npm install
  npm run build

  echo "==> 安装后端依赖（虚拟环境）..."
  setup_venv

  HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
  ADDR="http://${HOST_IP}${PORT:+:${PORT}}"
  echo ""
  echo "✅  Care360 Dashboard 已就绪"
  echo "    局域网访问地址：${ADDR}"
  echo ""

  cd "$DIR/backend"
  uvicorn main:app --host 0.0.0.0 --port "$PORT"
fi
