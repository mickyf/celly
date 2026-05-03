export async function resizeImage(
  file: File,
  maxDim = 1280,
  quality = 0.8,
  skipBelowBytes = 200 * 1024,
): Promise<File> {
  if (file.size <= skipBelowBytes) return file

  return new Promise<File>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const longest = Math.max(img.width, img.height)
        const ratio = longest > maxDim ? maxDim / longest : 1
        if (ratio === 1 && file.type === 'image/jpeg') {
          URL.revokeObjectURL(url)
          resolve(file)
          return
        }
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D context unavailable')
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (!blob) {
              reject(new Error('Image resize produced no blob'))
              return
            }
            if (blob.size >= file.size) {
              resolve(file)
              return
            }
            const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
            resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }))
          },
          'image/jpeg',
          quality,
        )
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for resize'))
    }
    img.src = url
  })
}
