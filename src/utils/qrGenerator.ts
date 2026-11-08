/**
 * Pure TypeScript QR Code generator (Byte Mode, Version 1 to 5).
 * Generates a 2D boolean matrix [row][col] where true = black, false = white.
 * Completely offline, zero native dependencies.
 */

// Reed-Solomon Galois Field tables for GF(256)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
})();

function gMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCalculateRemainder(data: Uint8Array, poly: Uint8Array): Uint8Array {
  const degree = poly.length - 1;
  const rem = new Uint8Array(data.length + degree);
  rem.set(data);
  for (let i = 0; i < data.length; i++) {
    const factor = rem[i];
    if (factor !== 0) {
      for (let j = 0; j < poly.length; j++) {
        rem[i + j] ^= gMul(poly[j], factor);
      }
    }
  }
  return rem.slice(data.length);
}

// Version configs for Low (L) error correction
interface VersionInfo {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  alignPos: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, ecBytes: 7, alignPos: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, ecBytes: 10, alignPos: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, ecBytes: 15, alignPos: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, ecBytes: 20, alignPos: [6, 26] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text);
  
  // Find appropriate version
  let info = VERSIONS[0];
  for (const v of VERSIONS) {
    if (utf8.length + 3 <= v.dataBytes) {
      info = v;
      break;
    }
    info = v;
  }

  // 1. Build bit stream (Byte mode: 0100 + 8-bit length + data)
  const bits: number[] = [0, 1, 0, 0];
  const len = utf8.length;
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);
  for (const b of utf8) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }

  // Terminator & padding
  while (bits.length < info.dataBytes * 8 && bits.length % 8 !== 0) bits.push(0);
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < info.dataBytes * 8) {
    const p = padBytes[padIdx % 2];
    for (let i = 7; i >= 0; i--) bits.push((p >> i) & 1);
    padIdx++;
  }

  // Convert bits to data bytes
  const data = new Uint8Array(info.dataBytes);
  for (let i = 0; i < info.dataBytes; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    data[i] = b;
  }

  // 2. Calculate Error Correction codewords
  const ecPoly = rsGeneratorPoly(info.ecBytes);
  const ec = rsCalculateRemainder(data, ecPoly);

  // Interleave
  const allCodewords = new Uint8Array(info.totalBytes);
  allCodewords.set(data, 0);
  allCodewords.set(ec, info.dataBytes);

  // 3. Matrix Setup
  const n = info.size;
  const matrix: (boolean | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const isFunction: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  function setFunc(r: number, c: number, val: boolean) {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  }

  // Finder patterns
  function addFinder(top: number, left: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFunc(top + r, left + c, isBorder || isInner);
      }
    }
    // Separators
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r;
        const cc = left + c;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && matrix[rr][cc] === null) {
          setFunc(rr, cc, false);
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, n - 7);
  addFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    if (matrix[6][i] === null) setFunc(6, i, i % 2 === 0);
    if (matrix[i][6] === null) setFunc(i, 6, i % 2 === 0);
  }

  // Dark module
  setFunc(4 * info.version + 9, 8, true);

  // Alignment patterns
  if (info.alignPos.length > 0) {
    const pos = info.alignPos;
    for (const r of pos) {
      for (const c of pos) {
        if (isFunction[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setFunc(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // Reserve format bits
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      if (matrix[8][i] === null) matrix[8][i] = false;
      if (matrix[i][8] === null) matrix[i][8] = false;
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    const r = n - 1 - i;
    const c = n - 1 - i;
    if (matrix[8][c] === null) matrix[8][c] = false;
    if (matrix[r][8] === null) matrix[r][8] = false;
    isFunction[8][c] = true;
    isFunction[r][8] = true;
  }

  // 4. Place Data Bits
  const dataBits: boolean[] = [];
  for (const byte of allCodewords) {
    for (let i = 7; i >= 0; i--) dataBits.push(((byte >> i) & 1) === 1);
  }

  let bitIdx = 0;
  let upwards = true;
  for (let right = n - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const colList = [right, right - 1];
    const rowList = upwards
      ? Array.from({ length: n }, (_, i) => n - 1 - i)
      : Array.from({ length: n }, (_, i) => i);

    for (const r of rowList) {
      for (const c of colList) {
        if (!isFunction[r][c]) {
          const bitVal = bitIdx < dataBits.length ? dataBits[bitIdx++] : false;
          // Apply mask 000: (r + c) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = bitVal !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // 5. Format Info: Mask 0, Error Correction L -> 15 bits = 0x77c4 (111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Top-left
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = tlCoords[i];
    matrix[r][c] = formatBits[i] === 1;
  }
  // Bottom-left / Top-right
  for (let i = 0; i < 7; i++) {
    matrix[n - 1 - i][8] = formatBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][n - 8 + i] = formatBits[7 + i] === 1;
  }

  return matrix.map((row) => row.map((cell) => cell ?? false));
}
