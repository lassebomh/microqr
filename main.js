import { createQRCode } from "./qrcode.js";

function getRandomChars(length) {
  return String.fromCharCode.apply(
    null,
    crypto.getRandomValues(new Uint8Array(length)).map((v) => (v % 94) + 32)
  );
}

const img = document.getElementById("qrcode");
img.style.imageRendering = "pixelated";

window.start = () => {
  const t = performance.now();

  let dataurl;

  while (performance.now() - t < 2000) {
    dataurl = createQRCode(
      getRandomChars(Math.floor(Math.random() * 2331) + 1)
    );
  }

  img.src = dataurl;
};

img.src = createQRCode("https://google.com");
// setTimeout(start, 50);
