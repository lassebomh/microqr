import { createQRCode } from "./qrcode.js";
import "./jsQR.js";

function getRandomChars(length) {
  return String.fromCharCode.apply(
    null,
    crypto.getRandomValues(new Uint8Array(length)).map((v) => (v % 94) + 32)
  );
}

async function getImageData(url) {
  return await new Promise((res) => {
    const image = new Image();
    image.src = url;

    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;

      const canvas = document.createElement("canvas");
      canvas.height = height + 2;
      canvas.width = width + 2;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 1, 1);

      const scale = 1.5;

      ctx.scale(scale, scale);

      const imageData = ctx.getImageData(
        0,
        0,
        (width + 2) * scale,
        (height + 2) * scale
      );

      res(imageData);
    };
  });
}

const img = document.getElementById("qrcode");
img.style.imageRendering = "pixelated";

const run_tests = async () => {
  performance.mark("total");

  const n = 100;
  const max = 2331;

  let misses = 0;
  let fails = 0;

  for (let i = 0; i < n; i++) {
    const length = Math.floor((i / n) * max) + 1;

    let string = getRandomChars(2000);
    let [url, symbol] = createQRCode(string);

    let imageData = await getImageData(url);

    let result = jsQR(imageData.data, imageData.width, imageData.height);

    // img.src = url;

    if (result == null) {
      console.warn(`Missed ${i}`);
      misses++;
    } else if (result.data !== string) {
      fails++;
      console.error(`Failed ${i}!`, fails);
    } else {
      console.log(`%cPassed ${i}!`, "color: lightgreen;");
    }
  }

  console.log(performance.measure("total").duration / n);

  console.log("---------------------");

  if (misses) {
    console.warn("Total misses:", misses);
  } else {
    console.log("%cNo misses!", "color: lightgreen;");
  }
  if (fails) {
    console.error("Total fails:", fails);
  } else {
    console.log("%cNo fails!", "color: lightgreen; font-weight: bold;");
  }
};

run_tests();
