"""생성한 BGM 원본(m4a/wav) → 게임용 mp3 루프로 변환.
  - 96kbps mp3, 라우드니스 -18 LUFS 로 통일(볼륨 편차 제거), 앞 1초 페이드인 / 끝 1.5초 페이드아웃(루프 이음새 완화)
사용: python tools/build_music.py <원본폴더>   (파일명 = 트랙 id, 예: home.m4a → game/assets/music/home.mp3)
"""
import os, sys, subprocess
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "game", "assets", "music")
FF = imageio_ffmpeg.get_ffmpeg_exe()


def convert(src, dst, dur=60):
    fade_out = max(0, dur - 1.5)
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", src,
                    "-af", f"afade=t=in:d=1,afade=t=out:st={fade_out}:d=1.5,loudnorm=I=-18:TP=-2",
                    "-codec:a", "libmp3lame", "-b:a", "96k", dst], check=True)
    print(f"  {os.path.basename(dst)} {os.path.getsize(dst) // 1024} KB")


if __name__ == "__main__":
    src_dir = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for f in sorted(os.listdir(src_dir)):
        name, ext = os.path.splitext(f)
        if ext.lower() not in (".m4a", ".wav", ".mp3", ".aac"): continue
        convert(os.path.join(src_dir, f), os.path.join(OUT, f"{name.lstrip('_')}.mp3"))
