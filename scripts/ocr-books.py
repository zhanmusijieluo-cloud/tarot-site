# OCR 扫描版占星书 (鲁道夫/灵魂的功课/顺逆皆宜) → 提取缓存txt
# 逐页落盘可断点续跑; 完成后打印 OCR_DONE
# 防CPU打满三件套: ①onnxruntime 线程限4(默认吃满全部核) ②每页间歇0.15s ③进程优先级降到 BelowNormal
import pymupdf, sys, os, time
os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("MKL_NUM_THREADS", "4")

# 自身进程降级 (Windows)
try:
    import win32process, win32api, win32con
    h = win32api.GetCurrentProcess()
    win32process.SetPriorityClass(h, win32process.BELOW_NORMAL_PRIORITY_CLASS)
except Exception:
    ps = f'(Get-Process -Id {os.getpid()}).PriorityClass="BelowNormal"'
    os.system(f'powershell -NoProfile -Command "{ps}" >nul 2>&1')

from rapidocr_onnxruntime import RapidOCR
# 线程限4核(默认-1吃满全部核) — 爸爸投诉CPU打满后定死; 参数经 Global 下发 Det/Cls/Rec
ocr = RapidOCR(intra_op_num_threads=4, inter_op_num_threads=1)

JOBS = [
    (r"D:/百度云/参考资料/鲁道夫-人际合盘占星全书.pdf", "鲁道夫-人际合盘占星全书"),
    (r"D:/百度云/参考资料/灵魂的功课_p193.pdf", "灵魂的功课"),
    (r"D:/百度云/参考资料/顺逆皆宜的人生_13209969.pdf", "顺逆皆宜的人生"),
]
T = r"C:/Users/99192/AppData/Local/Temp"
for pdf, name in JOBS:
    dst = f"D:/百度云/参考资料/.提取缓存/{name}.txt"
    done_path = f"{T}/ocr_{name}.done"
    if os.path.exists(done_path):
        print(f"skip {name} (已完成)")
        continue
    doc = pymupdf.open(pdf)
    pages = doc.page_count
    resume = 0
    if os.path.exists(dst):  # 断点续跑: 已有部分则从已OCR页数接着来
        prev = open(dst, encoding='utf-8').read()
        import re as _re
        marks = _re.findall(r"<<<第(\d+)页>>>", prev)
        if marks:
            resume = max(int(m) for m in marks)
            print(f"resume {name} from page {resume}")
    buf = [] if resume == 0 else [open(dst, encoding='utf-8').read()]
    t0 = time.time()
    for i in range(resume, pages):
        pix = doc[i].get_pixmap(dpi=180)
        img = f"{T}/ocrp.png"
        pix.save(img)
        result, _ = ocr(img)
        text = "\n".join(l[1] for l in (result or []))
        buf.append(f"\n<<<第{i+1}页>>>\n{text}")
        time.sleep(0.15)  # 每页喘息, 让前台交互不卡
        if (i + 1) % 20 == 0:
            open(dst, 'w', encoding='utf-8').write(''.join(buf))
            print(f"{name}: {i+1}/{pages}页 用时{time.time()-t0:.0f}s", flush=True)
    open(dst, 'w', encoding='utf-8').write(''.join(buf))
    open(done_path, 'w').write('1')
    print(f"DONE {name} 共{pages}页", flush=True)
print("OCR_DONE", flush=True)
