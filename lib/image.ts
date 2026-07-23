export type CompressedImage = {
  blob: Blob;
  base64: string;
  mimeType: string;
};

const MAX_DIMENSION = 1500;
const JPEG_QUALITY = 0.8;

export async function compressImageFile(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("تعذر معالجة الصورة");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("تعذر ضغط الصورة"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  const base64 = await blobToBase64(blob);

  return { blob, base64, mimeType: "image/jpeg" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
