#!/usr/bin/env bash
# 게임 재배포: 서비스워커 캐시 목록 갱신 → main 커밋/푸시 → game/ 폴더를 gh-pages로 발행
# 사용: bash tools/deploy.sh "커밋 메시지"
set -e
cd "$(dirname "$0")/.."
python tools/build_sw.py
git add -A
git commit -q -m "${1:-update}" || true
git push -q origin main
git subtree split --prefix game -b gh-pages-tmp -q
git push -q origin gh-pages-tmp:gh-pages --force
git branch -D gh-pages-tmp -q
echo "배포 완료 → https://tazan12.github.io/poko-focus-adventure/ (반영까지 1~2분)"
