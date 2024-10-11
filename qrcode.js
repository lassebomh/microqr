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

function fromString(string) {
  if (typeof string !== "string") {
    throw new Error("Param is not a string");
  }

  const lcStr = string.toLowerCase();

  switch (lcStr) {
    case "l":
    case "low":
      return ECLevel.L;

    case "m":
    case "medium":
      return ECLevel.M;

    case "q":
    case "quartile":
      return ECLevel.Q;

    case "h":
    case "high":
      return ECLevel.H;

    default:
      throw new Error("Unknown EC Level: " + string);
  }
}

ECLevel.isValid = function isValid(level) {
  return (
    level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4
  );
};

ECLevel.from = function from(value, defaultValue) {
  if (ECLevel.isValid(value)) {
    return value;
  }

  try {
    return fromString(value);
  } catch (e) {
    return defaultValue;
  }
};

function BitBuffer() {
  this.buffer = [];
  this.length = 0;
}

BitBuffer.prototype = {
  get: function (index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  },

  put: function (num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  },

  getLengthInBits: function () {
    return this.length;
  },

  putBit: function (bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> this.length % 8;
    }

    this.length++;
  },
};

function BitMatrix(size) {
  if (!size || size < 1) {
    throw new Error("BitMatrix size must be defined and greater than 0");
  }

  this.size = size;
  this.data = new Uint8Array(size * size);
  this.reservedBit = new Uint8Array(size * size);
}

BitMatrix.prototype.set = function (row, col, value, reserved) {
  const index = row * this.size + col;
  this.data[index] = value;
  if (reserved) this.reservedBit[index] = true;
};

BitMatrix.prototype.get = function (row, col) {
  return this.data[row * this.size + col];
};

BitMatrix.prototype.xor = function (row, col, value) {
  this.data[row * this.size + col] ^= value;
};

BitMatrix.prototype.isReserved = function (row, col) {
  return this.reservedBit[row * this.size + col];
};

const MaskPattern = {};

MaskPattern.Patterns = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7,
};

const PenaltyScores = {
  N1: 3,
  N2: 3,
  N3: 40,
  N4: 10,
};

MaskPattern.isValid = function isValid(mask) {
  return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
};

MaskPattern.from = function from(value) {
  return MaskPattern.isValid(value) ? parseInt(value, 10) : undefined;
};

MaskPattern.getPenaltyN1 = function getPenaltyN1(data) {
  const size = data.size;
  let points = 0;
  let sameCountCol = 0;
  let sameCountRow = 0;
  let lastCol = null;
  let lastRow = null;

  for (let row = 0; row < size; row++) {
    sameCountCol = sameCountRow = 0;
    lastCol = lastRow = null;

    for (let col = 0; col < size; col++) {
      let module = data.get(row, col);
      if (module === lastCol) {
        sameCountCol++;
      } else {
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        lastCol = module;
        sameCountCol = 1;
      }

      module = data.get(col, row);
      if (module === lastRow) {
        sameCountRow++;
      } else {
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
        lastRow = module;
        sameCountRow = 1;
      }
    }

    if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
    if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
  }

  return points;
};

MaskPattern.getPenaltyN2 = function getPenaltyN2(data) {
  const size = data.size;
  let points = 0;

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const last =
        data.get(row, col) +
        data.get(row, col + 1) +
        data.get(row + 1, col) +
        data.get(row + 1, col + 1);

      if (last === 4 || last === 0) points++;
    }
  }

  return points * PenaltyScores.N2;
};

MaskPattern.getPenaltyN3 = function getPenaltyN3(data) {
  const size = data.size;
  let points = 0;
  let bitsCol = 0;
  let bitsRow = 0;

  for (let row = 0; row < size; row++) {
    bitsCol = bitsRow = 0;
    for (let col = 0; col < size; col++) {
      bitsCol = ((bitsCol << 1) & 0x7ff) | data.get(row, col);
      if (col >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d)) points++;

      bitsRow = ((bitsRow << 1) & 0x7ff) | data.get(col, row);
      if (col >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d)) points++;
    }
  }

  return points * PenaltyScores.N3;
};

MaskPattern.getPenaltyN4 = function getPenaltyN4(data) {
  let darkCount = 0;
  const modulesCount = data.data.length;

  for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];

  const k = Math.abs(Math.ceil((darkCount * 100) / modulesCount / 5) - 10);

  return k * PenaltyScores.N4;
};

function getMaskAt(maskPattern, i, j) {
  switch (maskPattern) {
    case MaskPattern.Patterns.PATTERN000:
      return (i + j) % 2 === 0;
    case MaskPattern.Patterns.PATTERN001:
      return i % 2 === 0;
    case MaskPattern.Patterns.PATTERN010:
      return j % 3 === 0;
    case MaskPattern.Patterns.PATTERN011:
      return (i + j) % 3 === 0;
    case MaskPattern.Patterns.PATTERN100:
      return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case MaskPattern.Patterns.PATTERN101:
      return ((i * j) % 2) + ((i * j) % 3) === 0;
    case MaskPattern.Patterns.PATTERN110:
      return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
    case MaskPattern.Patterns.PATTERN111:
      return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;

    default:
      throw new Error("bad maskPattern:" + maskPattern);
  }
}

MaskPattern.applyMask = function applyMask(pattern, data) {
  const size = data.size;

  for (let col = 0; col < size; col++) {
    for (let row = 0; row < size; row++) {
      if (data.isReserved(row, col)) continue;
      data.xor(row, col, getMaskAt(pattern, row, col));
    }
  }
};

MaskPattern.getBestMask = function getBestMask(data, setupFormatFunc) {
  const numPatterns = Object.keys(MaskPattern.Patterns).length;
  let bestPattern = 0;
  let lowerPenalty = Infinity;

  for (let p = 0; p < numPatterns; p++) {
    setupFormatFunc(p);
    MaskPattern.applyMask(p, data);

    const penalty =
      MaskPattern.getPenaltyN1(data) +
      MaskPattern.getPenaltyN2(data) +
      MaskPattern.getPenaltyN3(data) +
      MaskPattern.getPenaltyN4(data);

    MaskPattern.applyMask(p, data);

    if (penalty < lowerPenalty) {
      lowerPenalty = penalty;
      bestPattern = p;
    }
  }

  return bestPattern;
};

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

const GF = {};

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(function initTables() {
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
})();

GF.log = function log(n) {
  if (n < 1) throw new Error("log(" + n + ")");
  return LOG_TABLE[n];
};

GF.exp = function exp(n) {
  return EXP_TABLE[n];
};

GF.mul = function mul(x, y) {
  if (x === 0 || y === 0) return 0;

  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
};

const Polynomial = {};

Polynomial.mul = function mul(p1, p2) {
  const coeff = new Uint8Array(p1.length + p2.length - 1);

  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      coeff[i + j] ^= GF.mul(p1[i], p2[j]);
    }
  }

  return coeff;
};

Polynomial.mod = function mod(divident, divisor) {
  let result = new Uint8Array(divident);

  while (result.length - divisor.length >= 0) {
    const coeff = result[0];

    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= GF.mul(divisor[i], coeff);
    }

    let offset = 0;
    while (offset < result.length && result[offset] === 0) offset++;
    result = result.slice(offset);
  }

  return result;
};

Polynomial.generateECPolynomial = function generateECPolynomial(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = Polynomial.mul(poly, new Uint8Array([1, GF.exp(i)]));
  }

  return poly;
};

function ReedSolomonEncoder(degree) {
  this.genPoly = undefined;
  this.degree = degree;

  if (this.degree) this.initialize(this.degree);
}

ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
  this.degree = degree;
  this.genPoly = Polynomial.generateECPolynomial(this.degree);
};

ReedSolomonEncoder.prototype.encode = function encode(data) {
  if (!this.genPoly) {
    throw new Error("Encoder not initialized");
  }

  const paddedData = new Uint8Array(data.length + this.degree);
  paddedData.set(data);

  const remainder = Polynomial.mod(paddedData, this.genPoly);

  const start = this.degree - remainder.length;
  if (start > 0) {
    const buff = new Uint8Array(this.degree);
    buff.set(remainder, start);

    return buff;
  }

  return remainder;
};

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

function getBestVersionForData(segments, errorCorrectionLevel) {
  let seg;

  const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);

  if (Array.isArray(segments)) {
    if (segments.length === 0) {
      return 1;
    }

    seg = segments[0];
  } else {
    seg = segments;
  }

  for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
    const totalCodewords = Utils.getSymbolTotalCodewords(currentVersion);

    const ecTotalCodewords = ECCode.getTotalCodewordsCount(currentVersion, ecl);

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

function getEncodedBits(version) {
  let d = version << 12;

  while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
    d ^= G18 << (Utils.getBCHDigit(d) - G18_BCH);
  }

  return (version << 12) | d;
}

const G15 =
  (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
const G15_BCH = Utils.getBCHDigit(G15);

function ByteData(data) {
  if (typeof data === "string") {
    this.data = new TextEncoder().encode(data);
  } else {
    this.data = new Uint8Array(data);
  }
}

ByteData.getBitsLength = function getBitsLength(length) {
  return length * 8;
};

ByteData.prototype.getLength = function getLength() {
  return this.data.length;
};

ByteData.prototype.getBitsLength = function getBitsLength() {
  return ByteData.getBitsLength(this.data.length);
};

ByteData.prototype.write = function (bitBuffer) {
  for (let i = 0, l = this.data.length; i < l; i++) {
    bitBuffer.put(this.data[i], 8);
  }
};

function setupFinderPattern(matrix, version) {
  const size = matrix.size;

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
          matrix.set(row + r, col + c, true, true);
        } else {
          matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
}

function setupTimingPattern(matrix) {
  const size = matrix.size;

  for (let r = 8; r < size - 8; r++) {
    const value = r % 2 === 0;
    matrix.set(r, 6, value, true);
    matrix.set(6, r, value, true);
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
  const bits = getEncodedBits(version);
  let row, col, mod;

  for (let i = 0; i < 18; i++) {
    row = Math.floor(i / 3);
    col = (i % 3) + size - 8 - 3;
    mod = ((bits >> i) & 1) === 1;

    matrix.set(row, col, mod, true);
    matrix.set(col, row, mod, true);
  }
}

function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
  const size = matrix.size;

  const data = (errorCorrectionLevel.bit << 3) | maskPattern;
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

function createData(version, errorCorrectionLevel, segments) {
  const buffer = new BitBuffer();

  segments.forEach(function (data) {
    buffer.put(1 << 2, 4);

    buffer.put(data.getLength(), getCharCountIndicator(version));

    data.write(buffer);
  });

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

function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
  let segments = [new ByteData(data)];

  const bestVersion = getBestVersionForData(segments, errorCorrectionLevel);

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

  const dataBits = createData(version, errorCorrectionLevel, segments);

  const moduleCount = Utils.getSymbolSize(version);
  const modules = new BitMatrix(moduleCount);

  setupFinderPattern(modules, version);
  setupTimingPattern(modules);
  setupAlignmentPattern(modules, version);

  setupFormatInfo(modules, errorCorrectionLevel, 0);

  if (version >= 7) {
    setupVersionInfo(modules, version);
  }

  setupData(modules, dataBits);

  if (isNaN(maskPattern)) {
    maskPattern = MaskPattern.getBestMask(
      modules,
      setupFormatInfo.bind(null, modules, errorCorrectionLevel)
    );
  }

  MaskPattern.applyMask(maskPattern, modules);

  setupFormatInfo(modules, errorCorrectionLevel, maskPattern);

  return {
    modules: modules,
    version: version,
    errorCorrectionLevel: errorCorrectionLevel,
    maskPattern: maskPattern,
    segments: segments,
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

  const symbol = createSymbol(input, undefined, ECLevel.M, undefined);

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
