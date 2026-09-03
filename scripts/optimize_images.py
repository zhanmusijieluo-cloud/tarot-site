# -*- coding: utf-8 -*-
"""public/images 目录下 PNG 大图转 WebP 的后台脚本。
被 sync-images.mjs 调用：node -> python optimize_images.py <images_dir>
在 Python 内部处理中文路径，避免跨进程 argv/env 编码问题。
"""
import os
import sys
from PIL import Image

MAXW = 1400
QUALITY = 80


def png_to_webp(png_path: str) -> bool:
    """将单个 PNG 转为同名 .webp；成功后删除原 PNG。返回是否成功。"""
    webp_path = os.path.splitext(png_path)[0] + ".webp"
    try:
        im = Image.open(png_path).convert("RGB")
        w, h = im.size
        if w > MAXW:
            im = im.resize((MAXW, int(h * MAXW / w)), Image.LANCZOS)
        im.save(webp_path, "WEBP", quality=QUALITY, method=6)
        os.remove(png_path)  # 不再保留大体积原图
        return True
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"[png2webp] 跳过 {png_path}: {exc}\n")
        return False


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("用法: python optimize_images.py <images_dir>\n")
        return 2
    images_dir = sys.argv[1]
    converted = 0
    for root, _dirs, files in os.walk(images_dir):
        for name in files:
            if name.lower().endswith(".png"):
                full = os.path.join(root, name)
                if png_to_webp(full):
                    converted += 1
    sys.stdout.write(f"[png2webp] 完成，转换 {converted} 个 PNG → WebP\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
