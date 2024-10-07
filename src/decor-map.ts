import * as vscode from "vscode";

import { getColorContrast } from "./dynamic-contrast";
import { type FormatCodes, PlatformFormatCodes } from "./constants";

import type { Config } from "./config";

export class DecorMap {
  protected _map = new Map<string, vscode.TextEditorDecorationType>();
  protected _keys: Array<string> = [];
  protected formatCodes: FormatCodes;

  public constructor(public readonly config: Config) {
    this.formatCodes = PlatformFormatCodes[config.version];
  }

  public get(color: string): vscode.TextEditorDecorationType {
    if (!this._map.has(color)) {
      console.log(`[mc-color]: creating decoration for ${color}`);
      const rules: vscode.DecorationRenderOptions = {};

      if (Object.values(this.formatCodes.Special).includes(color)) {
        switch (color) {
          case "BOLD":
            rules.fontWeight = "900";
            break;
          case "ITALIC":
            rules.fontStyle = "italic";
            break;
          case "UNDERLINE":
            rules.textDecoration = "underline";
            break;
          case "STRIKETHROUGH":
            rules.textDecoration = "line-through";
            break;
          case "UNDERLINE_STRIKETHROUGH":
            rules.textDecoration = "underline line-through !important";
            break;
          case "OBFUSCATED":
            // TODO: Maybe a better way to represent this?
            rules.opacity = "0.75";
            break;
        }
      } else {
        switch (this.config.marker) {
          case "outline":
            rules.border = `2px solid ${color}`;
            rules.borderRadius = "4px";
            break;
          case "foreground":
            rules.color = color;
            break;
          case "underline":
            rules.color = "invalid; border-bottom: solid 2px " + color;
            break;
          case "background":
            rules.backgroundColor = color;
            rules.color = getColorContrast(color);
            rules.border = `2px solid ${color}`;
            rules.borderRadius = "4px";
        }
      }

      this._map.set(color, vscode.window.createTextEditorDecorationType(rules));
      this._keys.push(color);
    }

    return this._map.get(color)!;
  }

  public keys(): Array<string> {
    return this._keys.slice();
  }

  public dispose(): void {
    this._map.forEach((decor) => {
      decor.dispose();
    });
  }
}
