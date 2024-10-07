import type { ConfigVersion } from "./config";

export interface FormatCodes {
  Colors: Record<string, string>;
  Special: Record<string, string>;
}
export const PlatformFormatCodes: Record<ConfigVersion, FormatCodes> = {
  bedrock: {
    Colors: {
      "0": "#000000",
      "1": "#0000AA",
      "2": "#00AA00",
      "3": "#00AAAA",
      "4": "#AA0000",
      "5": "#AA00AA",
      "6": "#FFAA00",
      "7": "#C6C6C6",
      "8": "#555555",
      "9": "#5555FF",
      a: "#55FF55",
      b: "#55FFFF",
      c: "#ff5555",
      d: "#ff55ff",
      e: "#ffff55",
      f: "#ffffff",
      g: "#ddd605",
      h: "#E3D4D1",
      i: "#CECACA",
      j: "#443A3B",
      m: "#971607",
      n: "#B4684D",
      p: "#DEB12D",
      q: "#47A036",
      s: "#2CBAA8",
      t: "#21497B",
      u: "#9A5CC6"
    },
    Special: {
      l: "BOLD",
      o: "ITALIC",
      r: "RESET",
      k: "OBFUSCATED"
    }
  },
  "bedrock-pre-1.19.70": {
    Colors: {
      "0": "#000000",
      "1": "#0000AA",
      "2": "#00AA00",
      "3": "#00AAAA",
      "4": "#AA0000",
      "5": "#AA00AA",
      "6": "#FFAA00",
      "7": "#C6C6C6",
      "8": "#555555",
      "9": "#5555FF",
      a: "#55FF55",
      b: "#55FFFF",
      c: "#ff5555",
      d: "#ff55ff",
      e: "#ffff55",
      f: "#ffffff",
      g: "#ddd605"
    },
    Special: {
      l: "BOLD",
      o: "ITALIC",
      r: "RESET",
      n: "UNDERLINE",
      m: "STRIKETHROUGH",
      k: "OBFUSCATED"
    }
  },
  java: {
    Colors: {
      "0": "#000000",
      "1": "#0000AA",
      "2": "#00AA00",
      "3": "#00AAAA",
      "4": "#AA0000",
      "5": "#AA00AA",
      "6": "#FFAA00",
      "7": "#C6C6C6",
      "8": "#555555",
      "9": "#5555FF",
      a: "#55FF55",
      b: "#55FFFF",
      c: "#ff5555",
      d: "#ff55ff",
      e: "#ffff55",
      f: "#ffffff"
    },
    Special: {
      l: "BOLD",
      o: "ITALIC",
      r: "RESET",
      n: "UNDERLINE",
      m: "STRIKETHROUGH",
      k: "OBFUSCATED"
    }
  }
};

export function isResetCode(code: string): boolean {
  return code === "r" || code === "RESET";
}
