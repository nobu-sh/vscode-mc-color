// Hex & RGB matchers
const rgbExp =
    /^rgba?[\s+]?\(\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*(?:,\s*([\d.]+)\s*)?\)/im,
  hexExp = /^(?:#)|([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/gim;

// *Ctrl + C*
// *Ctrl + V*
// "You mean our code <3"

export function getColorContrast(color: string) {
  const rgb = color.match(rgbExp);
  const hex = color.match(hexExp);
  let r: number, b: number, g: number;

  if (rgb) {
    r = Number.parseInt(rgb[1], 10);
    g = Number.parseInt(rgb[2], 10);
    b = Number.parseInt(rgb[3], 10);
  } else if (hex) {
    let hexStr: string;
    if (hex.length > 1) {
      hexStr = hex[1];
    } else {
      hexStr = hex[0];
    }
    if (hex.length === 3) {
      hexStr = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    r = Number.parseInt(hexStr.substring(0, 2), 16);
    g = Number.parseInt(hexStr.substring(2, 4), 16);
    b = Number.parseInt(hexStr.substring(4, 6), 16);
  } else {
    return "#FFFFFF";
  }

  const luminance = relativeLuminance(r, g, b);
  const luminanceWhite = 1.0;
  const luminanceBlack = 0.0;

  const contrastWhite = contrastRatio(luminance, luminanceWhite);
  const contrastBlack = contrastRatio(luminance, luminanceBlack);

  if (contrastWhite > contrastBlack) {
    return "#FFFFFF";
  } else {
    return "#000000";
  }
}

function contrastRatio(l1: number, l2: number): number {
  if (l2 < l1) {
    return (0.05 + l1) / (0.05 + l2);
  } else {
    return (0.05 + l2) / (0.05 + l1);
  }
}

function relativeLuminance(r8: number, g8: number, b8: number): number {
  const bigR = srgb8ToLinear(r8);
  const bigG = srgb8ToLinear(g8);
  const bigB = srgb8ToLinear(b8);
  return 0.2126 * bigR + 0.7152 * bigG + 0.0722 * bigB;
}

const srgb8ToLinear = (function () {
  const srgbLookupTable = new Float64Array(256);
  for (let i = 0; i < 256; ++i) {
    const c = i / 255.0;
    srgbLookupTable[i] =
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  return function srgb8ToLinear(c8: number): number {
    const index = Math.min(Math.max(c8, 0), 255) & 0xff;
    return srgbLookupTable[index];
  };
})();
