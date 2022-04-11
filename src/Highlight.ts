/* eslint-disable @typescript-eslint/naming-convention */
import {
  workspace,
  window,
  Range,
  TextDocument,
  Disposable,
} from 'vscode'
import { DecorMap } from './DecorMap'
import { Config } from './extension'


export class Highlight {
  public disposed = false
  public document: TextDocument | null
  public config: Config
  public decorations: DecorMap | null
  public listener: Disposable | null

  public constructor(document: TextDocument, config: Config) {
    this.document = document
    this.config = config
    this.decorations = new DecorMap(this.config)
    this.listener = workspace.onDidChangeTextDocument(({ document }) => this.onUpdate(document))
  }

  public async onUpdate(document = this.document): Promise<boolean | void> {
    // If diposed or document mismatch ignore.
    if (this.disposed || this.document?.uri.toString() !== document?.uri.toString()) {
      return
    }

    // Get text and version.
    const text = this.document!.getText()
    const version = this.document!.version.toString()

    // Call update
    return this.updateRange(text, version)
  }

  public async updateRange(text: string, version: string): Promise<boolean | void> {
    try {
      // Create new extract results for every prefix
      const results = this.config.prefixes!.map((p) => extract(text, this.config, p)).flat()

      // If version sum mismatch throw error and wait till next update
      const actualVersion = this.document?.version.toString()
      if (actualVersion !== version) {
        throw new Error('[mc-color]: Document version already changed, skipping')
      }

      // Create ranges
      const ranges = groupByColor(results)

      // If is disposed stop
      if (this.disposed) {
        return false
      }

      // Create update stack looks like:
      // {
      //    "hex_color": Range[]
      // }
      const updateStack = this.decorations!.keys()
        .reduce((state: Record<string, Range[]>, color: string) => {
          state[color] = []

          return state
        }, {})

      // Assign each color in update stack its range.
      for (const color in ranges) {
        updateStack[color] = ranges[color].map((i) => {
          return new Range(
            this.document!.positionAt(i.start),
            this.document!.positionAt(i.end),
          )
        })
      }

      // For each color in update stack
      for (const color in updateStack) {
        // Get the correlating decorations
        const decoration = this.decorations!.get(color)

        // Set it in editor
        window.visibleTextEditors
          .filter(({ document }) => document.uri === this.document!.uri)
          .forEach(editor => editor.setDecorations(decoration, updateStack[color]))
      }
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Dispose current highlighter
   */
  public dispose(): void {
    if (!this.disposed) {
      this.disposed = true
      this.decorations!.dispose()
      this.listener!.dispose()

      this.decorations = null
      this.document = null
      this.listener = null
    }
  }
}

interface ExtractResult {
  start: number
  end: number
  color: string
}

// Converts array of extract results into object formatted like so:
// {
//   "hex_color": ExtractResult[]
// }
function groupByColor(result: ExtractResult[]): Record<string, ExtractResult[]> {
  return result.reduce((c: Record<string, ExtractResult[]>, i: ExtractResult) => {
    if (!c[i.color]) {
      c[i.color] = []
    }

    c[i.color].push(i)

    return c
  }, {})
}

const colors = {
  '0': '#000000',
  '1': '#0000aa',
  '2': '#00aa00',
  '3': '#00aaaa',
  '4': '#aa0000',
  '5': '#aa00aa',
  '6': '#ffaa00',
  '7': '#aaaaaa',
  '8': '#555555',
  '9': '#5555ff',
  'a': '#55ff55',
  'b': '#55ffff',
  'c': '#ff5555',
  'd': '#ff55ff',
  'e': '#ffff55',
  'f': '#ffffff',
  'g': '#ddd605',
}

const special = {
  'l': 'BOLD',
  'o': 'ITALIC',
  'r': 'RESET'
}

function extract(text: string, config: Config, prefix: string): ExtractResult[] {
  const final: ExtractResult[] = []
  
  // Get all occurances of §
  const points = indicesOf(text, prefix)

  // For each indice of all §
  for (const point of points) {

    // Find the next delimiter. [§] and any defined in config count as delimiters.
    const d = findNextDelimiter(text, point + 1, [prefix, ...(config.delimiters ?? [])])

    // If its not reset then extend past formatting
    if (text[point + 1] !== 'r') {
      extendFormatting(final, d)
    }

    // If unknown color code skip
    if (!Object.keys(colors).includes(text[point + 1])) {
      // If its not reset then extend last color
      if (text[point + 1] !== 'r') {
        extendLastColor(final, d)
      }

      // If not a color and format 
      if (Object.keys(special).includes(text[point + 1])) {

        // Push special format to final array
        final.push({
          start: point,
          end: d,
          color: special[text[point + 1] as keyof typeof special],
        })

      }


      continue
    } else {
      // Attempt to get color from above
      const color = colors[text[point + 1] as keyof typeof colors]
      // If invalid color continue to next iteration
      if (!color) {
        continue
      } else {
        // If valid color push to final formatting array
        final.push({
          start: point,
          end: d,
          color,
        })
      }
    }
  }
  
  return final
}

function extendLastColor(r: ExtractResult[], index: number): void {
  // Increment through the final array backwards
  for (let i = r.length - 1; i > -1; i--) {
    // Check if it is a special formatting
    if (Object.values(special).includes(r[i].color)) {
      // If reset break, we dont want to extend past formatting
      if (r[i].color === 'RESET') {
        break
      }
      // Else continue
      continue
    } else {
      // Not special formatting but color so extend it then break
      r[i].end = index
      break
    }
  }
} 
function extendFormatting(r: ExtractResult[], index: number): void {
  // Increment through the final array backwards
  for (let i = r.length - 1; i > -1; i--) {
    // Check if it is a special formatting
    if (Object.values(special).includes(r[i].color)) {
      // If hit reset break, we dont want any formatting before that
      if (r[i].color === 'RESET') {
        break
      }
      // Extend past formatting
      r[i].end = index
    } else {
      // If color continue we dont care
      continue
    }
  }
} 

function findNextDelimiter(text: string, index: number, delimiters: string[]): number {
  // Increment through the text at given position
  for (let i = index; i < text.length; i++) {
    // Once delimiter is found
    if (delimiters.includes(text[i])) {
      // Return its index
      return i
    }
  }

  // No next delimiter so return end of text
  return text.length
}


function indicesOf(text: string, match: string): number[] {
  const indices: number[] = []
  // Increment through every character in the text
  for (let i = 0; i < text.length; i++) {
    // If text is equal to match
    if (text[i] === match) {
      // push the indice
      indices.push(i)
    }
  }

  return indices
}
