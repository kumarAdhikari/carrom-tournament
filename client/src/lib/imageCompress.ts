/**
 * Downscale and re-encode images so tournament state fits in localStorage (~5MB cap).
 * Full-quality phone photos as data URLs routinely exceed the quota and break cross-tab sync.
 */
export async function imageFileToStoredAvatarUrl(
  file: File,
  maxEdge = 320,
  jpegQuality = 0.82
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width: iw, height: ih } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", jpegQuality);
  } finally {
    bitmap.close();
  }
}
