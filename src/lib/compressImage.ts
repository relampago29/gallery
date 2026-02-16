/**
 * Comprime uma imagem File usando Canvas para respeitar o limite de upload do Vercel (4.5 MB).
 * Reduz a qualidade e/ou dimensões conforme necessário.
 */
export async function compressImage(
  file: File,
  options: {
    maxSizeMB?: number;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {},
): Promise<File> {
  const {
    maxSizeMB = 4,
    maxWidth = 2400,
    maxHeight = 2400,
    quality = 0.82,
  } = options;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Se já é pequeno o suficiente e é JPEG/WebP, devolve como está
  if (file.size <= maxSizeBytes && /image\/(jpeg|webp)/.test(file.type)) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Redimensionar se necessário
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg", lastModified: Date.now() },
          );

          resolve(compressedFile);
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Se não conseguir comprimir (ex: HEIC), devolve o original
      resolve(file);
    };

    img.src = url;
  });
}
