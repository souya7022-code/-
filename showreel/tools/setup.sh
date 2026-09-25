#!/usr/bin/env bash
# レンダリング環境の準備: libx264 対応 ffmpeg と playwright を用意し、FFMPEG のパスを出力する
set -e
if command -v ffmpeg >/dev/null && ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then
  echo "export FFMPEG=$(command -v ffmpeg)"; exit 0
fi
python3 -c "import imageio_ffmpeg" 2>/dev/null || pip install -q imageio-ffmpeg >&2
node -e "require('playwright')" 2>/dev/null || [ -d "$(npm root -g)/playwright" ] || npm i -g playwright >&2
echo "export FFMPEG=$(python3 -c 'import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())')"
