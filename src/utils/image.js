// // оййй тут утилита для сжатия изображений на клиенте... ня~~ 🦊

export async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    // Если это не картинка, или это анимированный гиф, возвращаем оригинал~~
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Рассчитываем новые пропорциональные размеры~~
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Сохраняем в jpeg для максимального сжатия~~
        const outputType = 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            
            // Создаем файл из blob~~
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: outputType,
              lastModified: Date.now()
            });

            // Возвращаем сжатый файл только если он реально меньше оригинала~~
            resolve(compressedFile.size < file.size ? compressedFile : file);
          },
          outputType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
