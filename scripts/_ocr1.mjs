import { RapidOCR } from 'rapidocr-onnxruntime'
import * as fs from 'fs'
const ocr = new RapidOCR({ intra_op_num_threads: 4, inter_op_num_threads: 1 })
const f = 'C:/Users/99192/AppData/Roaming/Hermes/composer-images/image_22e46d.png'
const res = await ocr.detect(f)
for (const r of res?.texts ?? res) {
  if (typeof r === 'string') console.log(r)
  else if (r?.text) console.log(`[${Math.round(r.box?.[0]?.[0] ?? 0)},${Math.round(r.box?.[0]?.[1] ?? 0)}]`, r.text)
}
