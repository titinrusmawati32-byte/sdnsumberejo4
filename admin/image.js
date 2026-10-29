/**
 * Modul Kompresi dan Pengolahan Gambar Klien (Client-Side Image Processing)
 * Mengompresi foto berukuran besar (hingga 50 MB / resolusi kamera tinggi)
 * langsung di browser pengguna sebelum diunggah ke server & Google Drive.
 */

window.ImageProcessor = (function () {
  const MAX_INPUT_SIZE = 50 * 1024 * 1024; // 50 MB
  const TARGET_MAX_OUTPUT_SIZE = 450 * 1024; // 450 KB (Kualitas HD tajam & cepat diunggah ke GAS)
  const ABSOLUTE_MAX_OUTPUT_SIZE = 1.5 * 1024 * 1024; // 1.5 MB batas aman payload JSON GAS
  const MAX_DIMENSION_DEFAULT = 1600; // px (Full HD tajam)
  const MAX_DIMENSION_HERO = 2000; // px

  /**
   * Mengompresi berkas gambar dari input file
   * @param {File} file Berkas gambar asli dari input/kamera (hingga 50 MB)
   * @param {string} purpose Tujuan penggunaan ('hero', 'guru', 'fasilitas', dll)
   * @returns {Promise<{base64: string, mime: string, name: string, width: number, height: number, size: number, sizeFormatted: string}>}
   */
  async function compressImage(file, purpose = "general") {
    if (!file) throw new Error("Berkas gambar tidak ditemukan.");

    if (file.size > MAX_INPUT_SIZE) {
      throw new Error(
        `Ukuran foto (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas 50 MB. Mohon pilih foto di bawah 50 MB.`
      );
    }

    const maxDimension = purpose === "hero" ? MAX_DIMENSION_HERO : MAX_DIMENSION_DEFAULT;

    // Baca berkas sebagai ImageBitmap atau HTMLImageElement menggunakan ObjectURL hemat memori
    const imgSource = await readImageSource(file);

    try {
      let width = imgSource.width || imgSource.naturalWidth || 1200;
      let height = imgSource.height || imgSource.naturalHeight || 900;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.max(1, Math.round((height * maxDimension) / width));
          width = maxDimension;
        } else {
          width = Math.max(1, Math.round((width * maxDimension) / height));
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(imgSource, 0, 0, width, height);

      // Kompresi bertahap kualitas & resolusi agar foto besar selalu berhasil ditampilkan
      let quality = 0.84;
      let blob = await getCanvasBlob(canvas, "image/jpeg", quality);

      while (blob.size > TARGET_MAX_OUTPUT_SIZE && quality > 0.52) {
        quality -= 0.08;
        blob = await getCanvasBlob(canvas, "image/jpeg", quality);
      }

      // Jika foto sangat detail dan masih di atas TARGET_MAX_OUTPUT_SIZE, perkecil dimensi secara bertahap
      let scaleStep = 0;
      while (blob.size > TARGET_MAX_OUTPUT_SIZE && scaleStep < 3 && canvas.width > 640) {
        scaleStep++;
        canvas.width = Math.max(480, Math.round(canvas.width * 0.78));
        canvas.height = Math.max(360, Math.round(canvas.height * 0.78));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgSource, 0, 0, canvas.width, canvas.height);
        blob = await getCanvasBlob(canvas, "image/jpeg", 0.78);
      }

      if (blob.size > ABSOLUTE_MAX_OUTPUT_SIZE) {
        canvas.width = Math.max(480, Math.round(canvas.width * 0.65));
        canvas.height = Math.max(360, Math.round(canvas.height * 0.65));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgSource, 0, 0, canvas.width, canvas.height);
        blob = await getCanvasBlob(canvas, "image/jpeg", 0.7);
      }

      const base64 = await blobToBase64(blob);
      const dotIdx = file.name ? file.name.lastIndexOf(".") : -1;
      const baseName = dotIdx > 0 ? file.name.substring(0, dotIdx) : file.name || "foto";
      const cleanFileName = sanitizeFileName(baseName) + ".jpg";

      return {
        base64: base64,
        mime: "image/jpeg",
        name: cleanFileName,
        width: canvas.width,
        height: canvas.height,
        size: blob.size,
        sizeFormatted: (blob.size / 1024).toFixed(0) + " KB"
      };
    } finally {
      // Bebaskan memori GPU/RAM segera setelah selesai menggambar ke canvas
      if (imgSource && typeof imgSource.close === "function") {
        try {
          imgSource.close();
        } catch (e) {}
      }
    }
  }

  function readImageSource(file) {
    if ("createImageBitmap" in window) {
      return createImageBitmap(file).catch(() => readImageElement(file));
    }
    return readImageElement(file);
  }

  function readImageElement(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Format foto tidak dapat dibaca oleh browser."));
      };
      img.src = objectUrl;
    });
  }

  function getCanvasBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
              return;
            }
            // Fallback jika canvas.toBlob mengembalikan null pada foto resolusi besar
            try {
              const dataUrl = canvas.toDataURL(type, quality);
              const parts = dataUrl.split(",");
              const byteString = atob(parts[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolve(new Blob([ab], { type }));
            } catch (err) {
              reject(err);
            }
          },
          type,
          quality
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || "");
        const commaIdx = result.indexOf(",");
        resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(new Error("Gagal mengonversi gambar terkompresi."));
      reader.readAsDataURL(blob);
    });
  }

  function sanitizeFileName(name) {
    return (
      String(name || "foto")
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 40) || "foto"
    );
  }

  return {
    compress: compressImage
  };
})();
