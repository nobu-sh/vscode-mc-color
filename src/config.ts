import * as vscode from "vscode";

export const ConfigVersions = [
  "bedrock",
  "bedrock-pre-1.21.50",
  "bedrock-pre-1.19.70",
  "java"
] as const;
export type ConfigVersion = (typeof ConfigVersions)[number];
export const ConfigMarkers = [
  "foreground",
  "background",
  "outline",
  "underline"
] as const;
export type ConfigMarker = (typeof ConfigMarkers)[number];

export interface Config {
  enable: boolean;
  prefixes: Array<string>;
  version: ConfigVersion;
  marker: ConfigMarker;
  fallback: boolean;
  fallbackRegex: Array<RegExp>;
}

export const DefaultConfig: Config = {
  enable: true,
  prefixes: ["&", "§"],
  version: "bedrock",
  marker: "foreground",
  fallback: true,
  // matches unix and windows line endings, single and double quotes, and backticks that are not escaped.
  fallbackRegex: [
    /(?<!\\)"/g, // Unescaped double quotes
    /(?<!\\)'/g, // Unescaped single quotes
    /(?<!\\)`/g, // Unescaped backticks
    /\r?\n/g // Newline (Unix or Windows style)
  ]
};

export function markerRespectsScope(marker: ConfigMarker): boolean {
  return marker === "foreground" || marker === "background";
}

export function configWarning(
  path: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue: any,
  ctx?: string
): void {
  console.warn(
    `[mc-color] config warning: value for "mc-color.${path}" is invalid. Falling back to default value: ${JSON.stringify(defaultValue)}. ${ctx ? `(${ctx})` : ""}`
  );
}

export function isStringArray(value: unknown): value is Array<string> {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function toRegexArray(value: Array<string>): Array<RegExp> {
  return value.map((v) => new RegExp(v, "g"));
}

export function isEnum<T extends ReadonlyArray<string>>(
  value: unknown,
  validValues: T
): value is T[number] {
  return typeof value === "string" && validValues.includes(value);
}

export function getConfig(): Config {
  const vscConfig = vscode.workspace.getConfiguration("mc-color");
  const config: Config = DefaultConfig;

  const enable = vscConfig.get("enable");
  if (typeof enable === "boolean") {
    config.enable = enable;
  } else {
    configWarning("enable", config.enable);
  }

  const prefixes = vscConfig.get("prefixes");
  if (isStringArray(prefixes)) {
    config.prefixes = prefixes;
  } else {
    configWarning("prefixes", config.prefixes);
  }

  const version = vscConfig.get("version");
  if (isEnum(version, ConfigVersions)) {
    config.version = version;
  } else {
    configWarning("version", config.version);
  }

  const marker = vscConfig.get("marker");
  if (isEnum(marker, ConfigMarkers)) {
    config.marker = marker;
  } else {
    configWarning("marker", config.marker);
  }

  const fallback = vscConfig.get("fallback");
  if (typeof fallback === "boolean") {
    config.fallback = fallback;
  } else {
    configWarning("fallback", config.fallback);
  }

  const fallbackRegex = vscConfig.get("fallbackRegex");
  if (isStringArray(fallbackRegex)) {
    try {
      config.fallbackRegex = toRegexArray(fallbackRegex);
    } catch (reason) {
      configWarning("fallbackRegex", config.fallbackRegex, String(reason));
    }
  } else {
    configWarning("fallbackRegex", config.fallbackRegex);
  }

  return config;
}
