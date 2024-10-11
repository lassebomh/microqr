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
  console.clear();
  const tests = 150;

  // for (let t = 0; t < tests; t++) {
  //   let string = getRandomChars(Math.floor(((t + 1) / tests) * 2331));
  //   localStorage.setItem("i" + t, string);
  //   localStorage.setItem("o" + t, createQRCode(string));
  // }

  for (let t = 0; t < tests; t++) {
    const string = localStorage.getItem("i" + t);
    try {
      if (localStorage.getItem("o" + t) !== createQRCode(string)) {
        throw new Error(`test ${t} didn't match`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  console.log("tests done");
};

img.src = localStorage.getItem("o" + 0);
setTimeout(start, 50);
