import * as vscode from 'vscode'
import { Config } from './extension'
import { getColorContrast } from './dynamicContraster'
import { Formats, MergedSpecialUnionWithHidden } from './Constants'

// Not commenting this out, literally just takes a color and creates css for it.
// Then stores it in a map so it only needs to create the css once.
// Its like a formatting css cache.
export class DecorMap {
  public config: Config
  public format: Formats
  protected _map = new Map<string, vscode.TextEditorDecorationType>()
  protected _keys: string[] = []

  constructor(config: Config, format: Formats) {
    this.config = config
    this.format = format
  }

  public get(color: string): vscode.TextEditorDecorationType {
    const { values } = this.format

    if (!this._map.has(color)) {
      const rules: vscode.DecorationRenderOptions = {}

      if (values.includes(color as MergedSpecialUnionWithHidden)) {
        switch(color as MergedSpecialUnionWithHidden) {
          case 'BOLD':
            rules.fontWeight = '900'
            break
          case 'ITALIC':
            rules.fontStyle = 'italic'
            break
          case 'UNDERLINE':
            rules.textDecoration = 'underline'
            break
          case 'STRIKETHROUGH':
            rules.textDecoration = 'line-through'
            break
          case 'UNDERLINE_STRIKETHROUGH':
            rules.textDecoration = 'underline line-through !important'
            break
          case 'OBFUSCATED':
            // TODO: Maybe a better way to represent this?
            rules.opacity = '0.75'
            break
        }
      } else {
        switch(this.config.markerType) {
          case 'outline':
            rules.border = `3px solid ${color}`
            break
          case 'foreground':
            rules.color = color
            break
          case 'underline':
            rules.color = 'invalid; border-bottom: solid 2px ' + color
            break
          case 'background':
          default:
            rules.backgroundColor = color
            rules.color = getColorContrast(color)
            rules.border = `3px solid ${color}`
            rules.borderRadius = '3px'
        }
      }

      this._map.set(color, vscode.window.createTextEditorDecorationType(rules))
      this._keys.push(color)
    }

    return this._map.get(color)!
  }

  public keys(): string[] {
    return this._keys.slice()
  }

  public dispose(): void {
    this._map.forEach((d) => {
      d.dispose()
    })
  }
}