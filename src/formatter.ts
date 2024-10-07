import * as vscode from "vscode";

import { fallbackTokenizer, type Token, Tokenizer } from "./tokenizer";
import { Grammars } from "./grammars";
import { DecorMap } from "./decor-map";
import { Grammar } from "./grammar";
import {
  type FormatCodes,
  isResetCode,
  PlatformFormatCodes
} from "./constants";
import { markerRespectsScope, type Config } from "./config";

interface Ranges {
  start: number;
  end: number;
}

interface ScopeRanges {
  start: number;
  end: number;
  ranges: Array<Ranges>;
}

interface ExtractionResult {
  start: number;
  end: number;
  color: string;
}

export class Formatter {
  private disposed = false;
  private tokenizer: Tokenizer | null = null;
  private decorations: DecorMap | null = null;
  private formatCodes: FormatCodes;
  private changeListener: vscode.Disposable | null;

  public constructor(
    public readonly document: vscode.TextDocument,
    public readonly config: Config
  ) {
    const grammar = Grammars.get(document.languageId);
    if (grammar) this.tokenizer = new Tokenizer(grammar);
    console.log(
      `[mc-color]:`,
      grammar
        ? `found grammar ${grammar.languageId} for ${document.fileName}`
        : `grammar for ${document.fileName} is not support, using fallback...`
    );

    this.decorations = new DecorMap(config);
    this.formatCodes = PlatformFormatCodes[config.version];

    this.changeListener = vscode.workspace.onDidChangeTextDocument(
      ({ document }) =>
        this.document?.uri.toString() === document?.uri.toString() &&
        this.onUpdate()
    );
  }

  public get editors() {
    return vscode.window.visibleTextEditors.filter(
      ({ document }) => document.uri === this.document!.uri
    );
  }

  private tokenize(text: string) {
    return this.tokenizer
      ? this.tokenizer.tokenize(text)
      : fallbackTokenizer(text, this.config.fallbackRegex);
  }

  public async onUpdate() {
    if (this.disposed) return;

    const text = this.document.getText();
    const version = this.document.version.toString();
    const tokens = this.tokenize(text);

    return this.format(text, tokens, version);
  }

  public format(text: string, tokens: Array<Token>, version: string) {
    if (this.disposed || !this.decorations) {
      console.error("[mc-color]: Formatter not ready, skipping...");
      return;
    }

    const scopes = this.tokensToScopeRanges(tokens);
    const extractionsByColor = this.processScopes(text, scopes);

    // Ensure all decoration keys are accounted for
    for (const key of this.decorations.keys()) {
      if (!extractionsByColor[key]) {
        extractionsByColor[key] = [];
      }
    }

    // Verify document version
    const actualVersion = this.document?.version.toString();
    if (actualVersion !== version) {
      console.error(
        "[mc-color]: Document version already changed, skipping..."
      );
      return;
    }

    for (const [color, ranges] of Object.entries(extractionsByColor)) {
      const decoration = this.decorations.get(color);
      for (const editor of this.editors) {
        editor.setDecorations(decoration, ranges);
      }
    }
  }

  private processScopes(
    text: string,
    scopes: Array<ScopeRanges>
  ): { [color: string]: Array<vscode.Range> } {
    const extractionsByColor: { [color: string]: Array<vscode.Range> } = {};

    for (const scope of scopes) {
      const sliced = text.slice(scope.start, scope.end);
      const extractions = this.mergeTypes(
        this.extendColors(
          this.extendFormatting(this.extract(sliced, scope.start))
        ),
        "UNDERLINE_STRIKETHROUGH",
        "UNDERLINE",
        "STRIKETHROUGH"
      );

      for (const extraction of extractions) {
        const allowedRanges = markerRespectsScope(this.config.marker)
          ? this.trimExtractionToAllowedRanges(extraction, scope.ranges)
          : [extraction];

        for (const { start, end } of allowedRanges) {
          const startPos = this.document.positionAt(start);
          const endPos = this.document.positionAt(end);
          const range = new vscode.Range(startPos, endPos);

          if (!extractionsByColor[extraction.color]) {
            extractionsByColor[extraction.color] = [];
          }

          extractionsByColor[extraction.color].push(range);
        }
      }
    }

    return extractionsByColor;
  }

  // We use the start index just for the final results so its all absolute and not relative
  private extract(text: string, start: number): Array<ExtractionResult> {
    const final: Array<ExtractionResult> = [];
    const prefixes = this.config.prefixes ?? [];
    if (prefixes.length === 0) return final;

    const prefixesSet = new Set(prefixes);
    const points = this.indicesOf(text, prefixesSet);
    if (points.length === 0) return final;

    const colorCodes = this.formatCodes.Colors;
    const specialCodes = this.formatCodes.Special;

    for (const point of points) {
      if (point + 1 >= text.length) continue;
      const codeChar = text[point + 1];
      const next = this.findNextDelimiter(text, point + 1, prefixesSet);

      const color = colorCodes[codeChar] || specialCodes[codeChar];
      if (color) {
        final.push({
          start: start + point,
          end: start + next,
          color: color
        });
      }
    }

    return final;
  }

  private trimExtractionToAllowedRanges(
    extraction: ExtractionResult,
    allowedRanges: Array<Ranges>
  ): Array<Ranges> {
    return allowedRanges
      .map((range) => {
        const overlapStart = Math.max(extraction.start, range.start);
        const overlapEnd = Math.min(extraction.end, range.end);
        return overlapStart < overlapEnd
          ? { start: overlapStart, end: overlapEnd }
          : null;
      })
      .filter((range): range is Ranges => range !== null);
  }

  private mergeTypes(
    extraction: Array<ExtractionResult>,
    to: string,
    ...types: Array<string>
  ): Array<ExtractionResult> {
    const endIndexGroup = extraction.reduce(
      (acc, item) => {
        const key = item.end;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<number, Array<ExtractionResult>>
    );

    for (const group of Object.values(endIndexGroup)) {
      if (group.length < types.length) continue;

      const samples = types.reduce(
        (map, type) => {
          const sample = group.find((i) => i.color === type);
          if (sample) map[type] = sample;
          return map;
        },
        {} as Record<string, ExtractionResult>
      );

      if (Object.keys(samples).length < types.length) continue;

      const startItem = Object.values(samples).reduce((prev, curr) =>
        curr.start > prev.start ? curr : prev
      );
      startItem.color = to;
    }

    return extraction;
  }

  private extendColors(
    extraction: Array<ExtractionResult>
  ): Array<ExtractionResult> {
    let index = extraction[extraction.length - 1]?.end ?? 0;
    const specialColors = new Set(Object.values(this.formatCodes.Special));

    for (let i = extraction.length - 1; i >= 0; i--) {
      const color = extraction[i].color;

      if (specialColors.has(color)) {
        if (isResetCode(color)) {
          index = extraction[i].start;
        }
      } else {
        extraction[i].end = index;
        index = extraction[i].start;
      }
    }

    return extraction;
  }

  private extendFormatting(
    extraction: Array<ExtractionResult>
  ): Array<ExtractionResult> {
    let index = extraction[extraction.length - 1]?.end ?? 0;
    const specialColors = new Set(Object.values(this.formatCodes.Special));

    for (let i = extraction.length - 1; i >= 0; i--) {
      const color = extraction[i].color;

      if (specialColors.has(color)) {
        if (isResetCode(color)) {
          index = extraction[i].start;
        } else {
          extraction[i].end = index;
        }
      } else if (this.config.version === "java") {
        index = extraction[i].start;
      }
    }

    return extraction;
  }

  private findNextDelimiter(
    text: string,
    index: number,
    delimitersSet: Set<string>
  ): number {
    for (let i = index; i < text.length; i++) {
      if (delimitersSet.has(text[i])) return i;
    }
    return text.length;
  }

  private indicesOf(text: string, matchesSet: Set<string>): Array<number> {
    const indices: Array<number> = [];
    for (let i = 0; i < text.length; i++) {
      if (matchesSet.has(text[i])) indices.push(i);
    }
    return indices;
  }

  // This version considers variables in scopes for coloring.
  // private tokensToScopeRanges(tokens: Array<Token>): Array<ScopeRanges> {
  //   const flattenedScopes: Array<ScopeRanges> = [];

  //   for (const token of tokens) {
  //     const scopedRange: ScopeRanges = {
  //       start: token.innerStart,
  //       end: token.innerEnd,
  //       ranges: []
  //     };

  //     if (
  //       !token.type.startsWith(Grammar.scope()) &&
  //       token.tokens.length === 0
  //     ) {
  //       scopedRange.ranges.push({
  //         start: token.innerStart,
  //         end: token.innerEnd
  //       });
  //     } else {
  //       let currentPos = token.innerStart;

  //       for (const child of token.tokens) {
  //         if (currentPos < child.start) {
  //           scopedRange.ranges.push({ start: currentPos, end: child.start });
  //         }

  //         const childFlattened = this.tokensToScopeRanges([child]);
  //         for (const flattened of childFlattened) {
  //           scopedRange.ranges.push(...flattened.ranges);
  //         }

  //         currentPos = child.end;
  //       }

  //       if (currentPos < token.innerEnd) {
  //         scopedRange.ranges.push({ start: currentPos, end: token.innerEnd });
  //       }
  //     }

  //     flattenedScopes.push(scopedRange);
  //   }

  //   return flattenedScopes;
  // }

  private tokensToScopeRanges(tokens: Array<Token>): Array<ScopeRanges> {
    const flattenedScopes: Array<ScopeRanges> = [];

    for (const token of tokens) {
      if (token.type.startsWith(Grammar.scope())) {
        // For scope tokens, process their child tokens without including the scope itself
        const childFlattened = this.tokensToScopeRanges(token.tokens);
        flattenedScopes.push(...childFlattened);
      } else {
        const scopedRange: ScopeRanges = {
          start: token.innerStart,
          end: token.innerEnd,
          ranges: []
        };

        if (token.tokens.length === 0) {
          // Token has no children, add its range directly
          scopedRange.ranges.push({
            start: token.innerStart,
            end: token.innerEnd
          });
        } else {
          // Token has children, process them recursively
          let currentPos = token.innerStart;

          for (const child of token.tokens) {
            if (currentPos < child.start) {
              scopedRange.ranges.push({ start: currentPos, end: child.start });
            }

            const childFlattened = this.tokensToScopeRanges([child]);
            for (const flattened of childFlattened) {
              scopedRange.ranges.push(...flattened.ranges);
            }

            currentPos = child.end;
          }

          if (currentPos < token.innerEnd) {
            scopedRange.ranges.push({ start: currentPos, end: token.innerEnd });
          }
        }

        flattenedScopes.push(scopedRange);
      }
    }

    return flattenedScopes;
  }

  public destroy() {
    if (!this.disposed) {
      this.disposed = true;
      this.changeListener?.dispose();
      this.changeListener = null;

      this.decorations?.dispose();
      this.decorations = null;
    }
  }
}
