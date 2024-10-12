const Utils = {};

const CODEWORDS_COUNT = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655,
  733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921,
  2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

Utils.getSymbolSize = function getSymbolSize(version) {
  if (!version) throw new Error('"version" cannot be null or undefined');
  if (version < 1 || version > 40)
    throw new Error('"version" should be in range from 1 to 40');
  return version * 4 + 17;
};

Utils.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
  return CODEWORDS_COUNT[version];
};

Utils.getBCHDigit = function (data) {
  let digit = 0;

  while (data !== 0) {
    digit++;
    data >>>= 1;
  }

  return digit;
};

const ECLevel = {};

ECLevel.L = { bit: 1 };
ECLevel.M = { bit: 0 };
ECLevel.Q = { bit: 3 };
ECLevel.H = { bit: 2 };

class BitBuffer {
  constructor() {
    this.buffer = [];
    this.length = 0;
  }

  get(index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  getLengthInBits() {
    return this.length;
  }

  putBit(bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> this.length % 8;
    }

    this.length++;
  }
}

class BitMatrix {
  constructor(size) {
    if (!size || size < 1) {
      throw new Error("BitMatrix size must be defined and greater than 0");
    }

    this.size = size;
    this.data = new Uint8Array(size * size);
    this.reservedBit = new Uint8Array(size * size);
  }

  set(row, col, value, reserved) {
    const index = row * this.size + col;
    this.data[index] = value;
    if (reserved) this.reservedBit[index] = true;
  }

  get(row, col) {
    return this.data[row * this.size + col];
  }

  xor(row, col, value) {
    this.data[row * this.size + col] ^= value;
  }

  isReserved(row, col) {
    return this.reservedBit[row * this.size + col];
  }
}

const ECCode = {};

const EC_BLOCKS_TABLE = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4,
  6, 5, 2, 4, 6, 6, 2, 5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4, 8, 10, 11, 4, 9, 12,
  16, 4, 9, 16, 16, 6, 10, 12, 18, 6, 10, 17, 16, 6, 11, 16, 19, 6, 13, 18, 21,
  7, 14, 21, 25, 8, 16, 20, 25, 8, 17, 23, 25, 9, 17, 23, 34, 9, 18, 25, 30, 10,
  20, 27, 32, 12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34, 40, 13, 26, 35, 42,
  14, 28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51, 17, 33, 45, 54, 18, 35, 48,
  57, 19, 37, 51, 60, 19, 38, 53, 63, 20, 40, 56, 66, 21, 43, 59, 70, 22, 45,
  62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
];

const EC_CODEWORDS_TABLE = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26, 48, 72, 88,
  36, 64, 96, 112, 40, 72, 108, 130, 48, 88, 132, 156, 60, 110, 160, 192, 72,
  130, 192, 224, 80, 150, 224, 264, 96, 176, 260, 308, 104, 198, 288, 352, 120,
  216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480, 168, 308, 448, 532,
  180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700, 224, 442, 644,
  750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960, 312, 588,
  870, 1050, 336, 644, 952, 1110, 360, 700, 1020, 1200, 390, 728, 1050, 1260,
  420, 784, 1140, 1350, 450, 812, 1200, 1440, 480, 868, 1290, 1530, 510, 924,
  1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530, 1800, 570, 1064, 1590,
  1890, 600, 1120, 1680, 1980, 630, 1204, 1770, 2100, 660, 1260, 1860, 2220,
  720, 1316, 1950, 2310, 750, 1372, 2040, 2430,
];

ECCode.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
  switch (errorCorrectionLevel) {
    case ECLevel.L:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
    case ECLevel.M:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
    case ECLevel.Q:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
    case ECLevel.H:
      return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
    default:
      return undefined;
  }
};

ECCode.getTotalCodewordsCount = function getTotalCodewordsCount(
  version,
  errorCorrectionLevel
) {
  switch (errorCorrectionLevel) {
    case ECLevel.L:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
    case ECLevel.M:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
    case ECLevel.Q:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
    case ECLevel.H:
      return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
    default:
      return undefined;
  }
};

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;

    x <<= 1;

    if (x & 0x100) {
      x ^= 0x11d;
    }
  }

  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255];
  }
}

function gfExp(n) {
  return EXP_TABLE[n];
}

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;

  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function polyMul(p1, p2) {
  const coeff = new Uint8Array(p1.length + p2.length - 1);

  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      coeff[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }

  return coeff;
}

function polyMod(divident, divisor) {
  let result = new Uint8Array(divident);

  while (result.length - divisor.length >= 0) {
    const coeff = result[0];

    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMul(divisor[i], coeff);
    }

    let offset = 0;
    while (offset < result.length && result[offset] === 0) offset++;
    result = result.slice(offset);
  }

  return result;
}

function generateECPolynomial(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, new Uint8Array([1, gfExp(i)]));
  }

  return poly;
}

class ReedSolomonEncoder {
  constructor(degree) {
    this.genPoly = undefined;
    this.degree = degree;

    if (this.degree) {
      this.degree = degree;
      this.genPoly = generateECPolynomial(this.degree);
    }
  }

  encode(data) {
    if (!this.genPoly) {
      throw new Error("Encoder not initialized");
    }

    const paddedData = new Uint8Array(data.length + this.degree);
    paddedData.set(data);

    const remainder = polyMod(paddedData, this.genPoly);

    const start = this.degree - remainder.length;
    if (start > 0) {
      const buff = new Uint8Array(this.degree);
      buff.set(remainder, start);

      return buff;
    }

    return remainder;
  }
}

function getCharCountIndicator(version) {
  if (version >= 1 && version < 10) return 8;
  else if (version < 27) return 16;
  return 16;
}

const G18 =
  (1 << 12) |
  (1 << 11) |
  (1 << 10) |
  (1 << 9) |
  (1 << 8) |
  (1 << 5) |
  (1 << 2) |
  (1 << 0);
const G18_BCH = Utils.getBCHDigit(G18);

function getBestVersionForData(seg, errorCorrectionLevel) {
  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
    const totalCodewords = Utils.getSymbolTotalCodewords(currentVersion);

    const ecTotalCodewords = ECCode.getTotalCodewordsCount(
      currentVersion,
      errorCorrectionLevel
    );

    const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

    const usableBits =
      dataTotalCodewordsBits - getCharCountIndicator(currentVersion) + 4;

    let capacity = Math.floor(usableBits / 8);

    if (seg.getLength() <= capacity) {
      return currentVersion;
    }
  }

  return undefined;
}

const G15 =
  (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
const G15_BCH = Utils.getBCHDigit(G15);

class ByteData {
  constructor(data) {
    if (typeof data === "string") {
      this.data = new TextEncoder().encode(data);
    } else {
      this.data = new Uint8Array(data);
    }
  }

  getLength() {
    return this.data.length;
  }

  getBitsLength() {
    return this.data.length * 8;
  }

  write(bitBuffer) {
    for (let i = 0, l = this.data.length; i < l; i++) {
      bitBuffer.put(this.data[i], 8);
    }
  }
}

function setupAlignmentPattern(matrix, version) {
  const coords = [];

  let pos;

  if (version === 1) {
    pos = [];
  } else {
    const posCount = Math.floor(version / 7) + 2;
    const size = Utils.getSymbolSize(version);
    const intervals =
      size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
    const positions = [size - 7];

    for (let i = 1; i < posCount - 1; i++) {
      positions[i] = positions[i - 1] - intervals;
    }

    positions.push(6);

    pos = positions.reverse();
  }

  const posLength = pos.length;

  for (let i = 0; i < posLength; i++) {
    for (let j = 0; j < posLength; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === posLength - 1) ||
        (i === posLength - 1 && j === 0)
      ) {
        continue;
      }

      coords.push([pos[i], pos[j]]);
    }
  }

  for (let i = 0; i < coords.length; i++) {
    const row = coords[i][0];
    const col = coords[i][1];

    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (
          r === -2 ||
          r === 2 ||
          c === -2 ||
          c === 2 ||
          (r === 0 && c === 0)
        ) {
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}

function setupVersionInfo(matrix, version) {
  const size = matrix.size;

  let d = version << 12;

  while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
    d ^= G18 << (Utils.getBCHDigit(d) - G18_BCH);
  }

  const bits = (version << 12) | d;

  let row, col, mod;

  for (let i = 0; i < 18; i++) {
    row = Math.floor(i / 3);
    col = (i % 3) + size - 8 - 3;
    mod = ((bits >> i) & 1) === 1;

    matrix.set(row, col, mod, true);
    matrix.set(col, row, mod, true);
  }
}

function setupFormatInfo(matrix, errorCorrectionLevel) {
  const size = matrix.size;

  const data = (errorCorrectionLevel.bit << 3) | 2;
  let d = data << 10;

  while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
    d ^= G15 << (Utils.getBCHDigit(d) - G15_BCH);
  }

  const bits = ((data << 10) | d) ^ G15_MASK;

  let i, mod;

  for (i = 0; i < 15; i++) {
    mod = ((bits >> i) & 1) === 1;

    if (i < 6) {
      matrix.set(i, 8, mod, true);
    } else if (i < 8) {
      matrix.set(i + 1, 8, mod, true);
    } else {
      matrix.set(size - 15 + i, 8, mod, true);
    }

    if (i < 8) {
      matrix.set(8, size - i - 1, mod, true);
    } else if (i < 9) {
      matrix.set(8, 15 - i - 1 + 1, mod, true);
    } else {
      matrix.set(8, 15 - i - 1, mod, true);
    }
  }

  matrix.set(size - 8, 8, 1, true);
}

function setupData(matrix, data) {
  const size = matrix.size;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;

    while (true) {
      for (let c = 0; c < 2; c++) {
        if (!matrix.isReserved(row, col - c)) {
          let dark = false;

          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
          }

          matrix.set(row, col - c, dark);
          bitIndex--;

          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }

      row += inc;

      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
}

function createData(version, errorCorrectionLevel, segment) {
  const buffer = new BitBuffer();

  buffer.put(4, 4);
  buffer.put(segment.getLength(), getCharCountIndicator(version));
  segment.write(buffer);

  const totalCodewords = Utils.getSymbolTotalCodewords(version);
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(
    version,
    errorCorrectionLevel
  );
  const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

  if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
    buffer.put(0, 4);
  }

  while (buffer.getLengthInBits() % 8 !== 0) {
    buffer.putBit(0);
  }

  const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
  for (let i = 0; i < remainingByte; i++) {
    buffer.put(i % 2 ? 0x11 : 0xec, 8);
  }

  return createCodewords(buffer, version, errorCorrectionLevel);
}

function createCodewords(bitBuffer, version, errorCorrectionLevel) {
  const totalCodewords = Utils.getSymbolTotalCodewords(version);

  const ecTotalCodewords = ECCode.getTotalCodewordsCount(
    version,
    errorCorrectionLevel
  );

  const dataTotalCodewords = totalCodewords - ecTotalCodewords;

  const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);

  const blocksInGroup2 = totalCodewords % ecTotalBlocks;
  const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;

  const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);

  const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
  const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;

  const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;

  const rs = new ReedSolomonEncoder(ecCount);

  let offset = 0;
  const dcData = new Array(ecTotalBlocks);
  const ecData = new Array(ecTotalBlocks);
  let maxDataSize = 0;
  const buffer = new Uint8Array(bitBuffer.buffer);

  for (let b = 0; b < ecTotalBlocks; b++) {
    const dataSize =
      b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;

    dcData[b] = buffer.slice(offset, offset + dataSize);

    ecData[b] = rs.encode(dcData[b]);

    offset += dataSize;
    maxDataSize = Math.max(maxDataSize, dataSize);
  }

  const data = new Uint8Array(totalCodewords);
  let index = 0;
  let i, r;

  for (i = 0; i < maxDataSize; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      if (i < dcData[r].length) {
        data[index++] = dcData[r][i];
      }
    }
  }

  for (i = 0; i < ecCount; i++) {
    for (r = 0; r < ecTotalBlocks; r++) {
      data[index++] = ecData[r][i];
    }
  }

  return data;
}

export function createSymbol(data, version, errorCorrectionLevel = ECLevel.M) {
  let segment = new ByteData(data);

  const bestVersion = getBestVersionForData(segment, errorCorrectionLevel);

  if (!bestVersion) {
    throw new Error("The amount of data is too big to be stored in a QR Code");
  }

  if (!version) {
    version = bestVersion;
  } else if (version < bestVersion) {
    throw new Error(
      "\n" +
        "The chosen QR Code version cannot contain this amount of data.\n" +
        "Minimum version required to store current data is: " +
        bestVersion +
        ".\n"
    );
  }

  const dataBits = createData(version, errorCorrectionLevel, segment);

  const moduleCount = Utils.getSymbolSize(version);
  const modules = new BitMatrix(moduleCount);

  const size = modules.size;

  const pos = [
    [0, 0],

    [size - 7, 0],

    [0, size - 7],
  ];

  for (let i = 0; i < pos.length; i++) {
    const row = pos[i][0];
    const col = pos[i][1];

    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue;

      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue;

        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          modules.set(row + r, col + c, true, true);
        } else {
          modules.set(row + r, col + c, false, true);
        }
      }
    }
  }

  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0;
    modules.set(r, 6, value, true);
    modules.set(6, r, value, true);
  }

  setupAlignmentPattern(modules, version);

  setupFormatInfo(modules, errorCorrectionLevel);

  if (version >= 7) {
    setupVersionInfo(modules, version);
  }

  setupData(modules, dataBits);

  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      if (modules.isReserved(row, col)) continue;
      modules.xor(row, col, col % 3 === 0);
    }
  }

  return {
    modules: modules,
    version: version,
    errorCorrectionLevel: errorCorrectionLevel,
    maskPattern: 2,
    segment: segment,
  };
}

export function createQRCode(
  input,
  col1 = [0x00, 0x00, 0x00],
  col0 = [0xff, 0xff, 0xff]
) {
  if (typeof input === "undefined" || input === "") {
    throw new Error("No input text");
  }

  const symbol = createSymbol(input);

  let { data, size } = symbol.modules;

  const BYTES_PER_ROW = Math.ceil(size / 8 / 4) * 4;

  const HEADER_SIZE = 16;
  const PIXELS_OFFSET = HEADER_SIZE + 22;

  const bmp = new Uint8Array(PIXELS_OFFSET + BYTES_PER_ROW * size);

  bmp.set([66, 77, bmp.length]); // signature + file size
  bmp.set([PIXELS_OFFSET], 10); // offset to pixel data
  bmp.set([HEADER_SIZE], 14); // header size
  bmp.set([size], 18); // image width
  bmp.set([size], 22); // image height
  bmp.set([1], 26); // color planes
  bmp.set([1], 28); // bits per pixel
  bmp.set([col1[2], col1[1], col1[0]], 34); // color 1
  bmp.set([col0[2], col0[1], col0[0]], 30); // color 0

  for (let y = 0; y < size; y++) {
    const row = new Uint8Array(BYTES_PER_ROW);
    for (let x = 0; x < size; x++) {
      const value = data[y * size + x];
      if (!value) continue;
      row[Math.floor(x / 8)] |= value << (7 - (x % 8));
    }
    bmp.set(row, bmp.length - BYTES_PER_ROW * (y + 1));
  }

  return [
    `data:image/bmp;base64,${btoa(String.fromCharCode.apply(null, bmp))}`,
    symbol,
  ];
}
