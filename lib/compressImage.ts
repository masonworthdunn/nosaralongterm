// Resize and compress a photo before upload.
// Max 1200px on longest side, JPEG quality 0.82 — keeps photos looking good at ~150-250KB.
export async function compressImage(file: File): Promise<Blob> {
  const MAX_PX = 1200
  const QUALITY = 0.82

  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) { height = Math.round((height / width) * MAX_PX); width = MAX_PX }
        else { width = Math.round((width / height) * MAX_PX); height = MAX_PX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', QUALITY)
    }
    img.onerror = reject
    img.src = url
  })
}
