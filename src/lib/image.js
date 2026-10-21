/**
 * Reads an image File, validates its type, crops it to a center square,
 * resizes it to 128x128 px, and returns a compressed JPEG data URL (~20–40 KB).
 */
export async function fileToAvatar(file, maxDimension = 128, quality = 0.85) {
  if (!file) {
    throw new Error('No file provided')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (PNG, JPG, WebP, etc.).')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read the selected file.'))

    reader.onload = () => {
      const img = new Image()

      img.onerror = () => reject(new Error('Failed to load image data.'))

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = maxDimension
        canvas.height = maxDimension

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not initialize canvas context.'))
          return
        }

        // Center-crop to square
        const minEdge = Math.min(img.width, img.height)
        const sx = (img.width - minEdge) / 2
        const sy = (img.height - minEdge) / 2

        ctx.drawImage(
          img,
          sx,
          sy,
          minEdge,
          minEdge,
          0,
          0,
          maxDimension,
          maxDimension
        )

        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }

      img.src = reader.result
    }

    reader.readAsDataURL(file)
  })
}