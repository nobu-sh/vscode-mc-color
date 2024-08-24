import {
  workspace,
  window,
  Range,
  TextDocument,
  Disposable,
} from 'vscode'
import { DecorMap } from './DecorMap'
import { Config } from './extension'
import { Formats, getFormats, MergedSpecialUnion, SpecialHiddenUnion } from './Constants'

interface ExtractResult {
  start: number
  end: number
  color: string
}

export class Highlight {
  public disposed = false
  public document: TextDocument | null
  public config: Config
  public decorations: DecorMap | null
  public listener: Disposable | null
  public format: Formats

  public constructor(document: TextDocument, config: Config) {
    this.document = document
    this.config = config
    this.format = getFormats(this.config.mode || 'bedrock')
    this.decorations = new DecorMap(this.config, this.format)
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
      // Gets all color and format tokens in text
      const tokens = this.extract(text, this.config)

      if (!tokens.length) {
        return false
      }

      // Iterates through the array backwards and extends the formatting to
      // the nearest reset token
      this.extendFormatting(tokens)

      // Iterates through the array backwards and extends the color to
      // the nearest next color or reset token
      this.extendColors(tokens)

      // Create new extract results for every prefix
      // merges instances of underline and strikethrough into one hidden
      // style type because they both need to utilize the same css
      // variable
      const results = this.mergeTypes(
        tokens,
        'UNDERLINE_STRIKETHROUGH',
        'UNDERLINE',
        'STRIKETHROUGH'
      )

      // If version sum mismatch throw error and wait till next update
      const actualVersion = this.document?.version.toString()
      if (actualVersion !== version) {
        throw new Error('[mc-color]: Document version already changed, skipping')
      }

      // Create ranges
      const ranges = this.groupByColor(results)

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

  private mergeTypes(result: ExtractResult[], to: SpecialHiddenUnion, ...types: MergedSpecialUnion[]): ExtractResult[] {
    // Groups all results by the ending index
    const endIndexGroup = result.reduce((c: Record<number, ExtractResult[]>, i: ExtractResult) => {
      if (!c[i.end]) {
        c[i.end] = []
      }

      c[i.end].push(i)

      return c
    }, {})

    Object.entries(endIndexGroup).forEach(([, v]) => {
      // If less than two elements return
      if (v.length < 2) {
        return
      }

      // Grab the first occuring sample of each type
      const samples = types.map((t) =>
        v.filter((i) => i.color === t)
          .sort((a, b) => a.start - b.start)[0]
      ).filter((t) => t)

      // If there are less samples then types return
      if (samples.length < types.length) {
        return
      }

      // Get the last occurring instance.
      const start = samples.sort((a, b) => b.start - a.start)[0]

      // Convert that instance to what we want.
      start.color = to
    })

    // Gets all the values from grouped list and flattens into one array
    return Object.values(endIndexGroup).flat()
  }

  private groupByColor(result: ExtractResult[]): Record<string, ExtractResult[]> {
    return result.reduce((c: Record<string, ExtractResult[]>, i: ExtractResult) => {
      if (!c[i.color]) {
        c[i.color] = []
      }
  
      c[i.color].push(i)
  
      return c
    }, {})
  }

  private extract(text: string, config: Config): ExtractResult[] {
    const { colors, special } = this.format
    const final: ExtractResult[] = []
  
    // Get all occurances of §
    const points = this.indicesOf(text, config.prefixes ?? [])
    if (!points.length) {
      return final
    }
  
    const prefixes = config.prefixes ?? []
    const delimiters = config.delimiters ?? []
  
    if (config.newLineDelimiter) {
      delimiters.push('\n')
    }
  
    // For each indice of all §
    for (const point of points) {
      // Find the next delimiter. [§] and any defined in config count as delimiters.
      let d = this.findNextDelimiter(text, point + 1, [...prefixes, ...delimiters])
  
      // Sets the start and end for color and special formats
      if (Object.keys(colors).includes(text[point + 1])) {
        const color = colors[text[point + 1] as keyof typeof colors]
  
        if (color) {
          final.push({
            start: point,
            end: d,
            color,
          })
        }
      } else if (Object.keys(special).includes(text[point + 1])) {
  
        // Push special format to final array
        final.push({
          start: point,
          end: d,
          color: special[text[point + 1] as keyof typeof special],
        })
  
      }
  
      // If the delimiter is a stop point delimiter and not prefix we need to 
      // push a reset token because delimiters act as alternative reset tokens
      if (delimiters.includes(text[d])) {
        final.push({
          start: d,
          end: d,
          color: special.r,
        })
      }
    }
    
    return final
  }

  private extendColors(r: ExtractResult[]): void {
    const { special, values } = this.format
    let index = r[r.length - 1].end
  
    // Increment through the final array backwards
    for (let i = r.length - 1; i > -1; i--) {
      // Check if it is a special formatting
      if (values.includes(r[i].color as MergedSpecialUnion)) {
        // If reset break, we dont want to extend past formatting
        if (r[i].color === special.r) {
          index = r[i].start
          continue
        }
        // Else continue
        continue
      } else {
        // Not special formatting but color so extend it then break
        r[i].end = index
        index = r[i].start
        continue
      }
    }
  }

  private extendFormatting(r: ExtractResult[]): void {
    const { special, values } = this.format
    let index = r[r.length - 1].end
    // Increment through the final array backwards
    for (let i = r.length - 1; i > -1; i--) {
      // Check if it is a special formatting
      if (values.includes(r[i].color as MergedSpecialUnion)) {
        // If hit reset break, we dont want any formatting before that
        if (r[i].color === special.r) {
          index = r[i].start
          continue
        }
        // Extend past formatting
        r[i].end = index
      } else {
        // If color continue we dont care

        // Update we do care. Java has a bug where format resets at a the next color
        // So if its a color we need to stop the formatting at the next color
        if (this.config.replicateJavaBug) {
          index = r[i].start
        }

        continue
      }
    }
  }

  private findNextDelimiter(text: string, index: number, delimiters: string[]): number {
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

  private indicesOf(text: string, match: string[]): number[] {
    const indices: number[] = []
    // Increment through every character in the text
    for (let i = 0; i < text.length; i++) {
      // If text is equal to match
      if (match.includes(text[i])) {
        // push the indice
        indices.push(i)
      }
    }
  
    return indices
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
