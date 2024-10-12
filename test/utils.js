import "https://unpkg.com/jsqr@1.4.0/dist/jsQR.js";

export function getRandomChars(length) {
  return String.fromCharCode.apply(
    null,
    crypto.getRandomValues(new Uint8Array(length)).map((v) => (v % 94) + 32)
  );
}

export async function getImageData(url) {
  return await new Promise((res) => {
    const image = new Image();
    image.src = url;

    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");

      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0);

      const scale = 1.5;

      ctx.scale(scale, scale);

      const imageData = ctx.getImageData(0, 0, width * scale, height * scale);

      res(imageData);
    };
  });
}
