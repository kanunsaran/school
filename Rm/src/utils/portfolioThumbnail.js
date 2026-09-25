// สร้างรูปปก (cover) ของผลงานฝั่ง client เอง เพราะ backend ยังไม่มี image/pdf processing library ใดๆ
// รูป -> ใช้รูปนั้นตรงๆ, PDF -> render หน้าแรกด้วย pdfjs-dist, วิดีโอ -> capture เฟรมแรก, ไฟล์อื่น -> ไม่มีปก (โชว์ไอคอนแทน)

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const MAX_COVER_WIDTH = 480;

function canvasToJpegDataUrl(canvas) {
  return canvas.toDataURL("image/jpeg", 0.82);
}

function scaledCanvasFrom(sourceWidth, sourceHeight) {
  const scale = Math.min(1, MAX_COVER_WIDTH / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  return canvas;
}

export async function coverFromImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = scaledCanvasFrom(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvasToJpegDataUrl(canvas);
}

export async function coverFromPdfFile(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2, MAX_COVER_WIDTH / baseViewport.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");

  await page.render({ canvasContext: ctx, viewport }).promise;
  await pdf.destroy();
  return canvasToJpegDataUrl(canvas);
}

export function coverFromVideoFile(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(video.src);

    video.onloadeddata = () => {
      // เลื่อนไปนิดหน่อยกันเฟรมแรกเป็นจอดำล้วน
      video.currentTime = Math.min(0.5, (video.duration || 1) / 4);
    };
    video.onseeked = () => {
      const canvas = scaledCanvasFrom(video.videoWidth, video.videoHeight);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      cleanup();
      resolve(canvasToJpegDataUrl(canvas));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("อ่านไฟล์วิดีโอไม่สำเร็จ"));
    };
  });
}

// คืน dataURL ของปก หรือ null ถ้าไฟล์ประเภทนี้ทำปกอัตโนมัติไม่ได้ (จะใช้ไอคอนแทนตอนแสดงผล)
export async function generateCoverForFile(file) {
  try {
    if (file.type.startsWith("image/")) return await coverFromImageFile(file);
    if (file.type === "application/pdf") return await coverFromPdfFile(file);
    if (file.type.startsWith("video/")) return await coverFromVideoFile(file);
    return null;
  } catch (err) {
    console.error("สร้างปกผลงานไม่สำเร็จ:", err);
    return null;
  }
}

export function fileKindOf(mimeType = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "file";
}
