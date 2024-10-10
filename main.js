import { create, bmatToUrl } from "./qrcode.js";

console.log("hello");

let qrCode = create(
  "https://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps://google.comhttps",
  {}
);

let bitmap = [];

for (let i = 0; i < qrCode.modules.size; i++) {
  let row = [];

  for (let ii = 0; ii < qrCode.modules.size; ii++) {
    row.push(qrCode.modules.data[i * qrCode.modules.size + ii]);
  }

  bitmap.push(row);
}

const img = document.getElementById("qrcode");
img.style.imageRendering = "pixelated";

img.src = bmatToUrl(bitmap, [0, 0, 0], [0, 100, 255]);
