import type { Definition, Grammar } from "./grammar";

export interface Token {
  type: string;
  start: number;
  end: number;
  innerStart: number;
  innerEnd: number;
  tokens: Array<Token>;
}

export class Tokenizer {
  protected _index = 0;
  protected _content = "";

  public constructor(public readonly grammar: Grammar) {}

  public get index(): number {
    return this._index;
  }

  public get finished(): boolean {
    return this._index >= this._content.length;
  }

  public peek(amt: number = 1): string {
    return this._content.slice(this._index, this._index + amt);
  }

  public consume(amt: number = 1): string {
    const value = this.peek(amt);
    this._index += amt;
    return value;
  }

  public searchDefinitions(
    start: string
  ): Array<Definition & { directMatch?: true }> {
    return this.grammar.definitions
      .filter((definition) => definition.start.startsWith(start))
      .map((definition) =>
        definition.start === start
          ? { ...definition, directMatch: true }
          : definition
      );
  }

  public tokenize(content?: string): Array<Token> {
    if (content) this._content = content;
    this._index = 0;
    return this._tokenize();
  }

  private _tokenize(): Array<Token> {
    const tokens: Array<Token> = [];
    while (!this.finished) {
      const token = this._tokenizeSingle();
      if (token) tokens.push(token);
    }
    return tokens;
  }

  private _tokenizeSingle(): Token | null {
    const start = this.index;
    const char = this.consume(); // always consume at least one
    let matches = this.searchDefinitions(char);

    // If no definition matches even the first char, bail
    if (matches.length === 0) {
      return null;
    }

    let match: Definition | null = null;
    let consumed = char;

    // Determine how far we should attempt partial matching
    // (avoid scanning beyond the largest start length)
    const maxLen = Math.max(
      ...this.grammar.definitions.map((d) => d.start.length)
    );

    while (matches.length > 1 && !this.finished) {
      // If we already found an exact match, we could break, but we'll
      // keep going to allow a longer directMatch if it exists.
      const exactMatch = matches.find((def) => def.directMatch);
      if (exactMatch) {
        match = exactMatch;
      }

      // If we've already consumed as many chars as the max start,
      // no point in going further; it won't become direct
      if (consumed.length >= maxLen) {
        break;
      }

      consumed += this.consume();
      matches = this.searchDefinitions(consumed);
    }

    // If no direct match is confirmed, check if the single leftover is direct
    if (!match && matches[0]?.directMatch) {
      match = matches[0];
    }

    if (!match) {
      // No definitive match
      return null;
    }

    // Otherwise create the token
    return this._createToken(match, start);
  }

  private _createToken(match: Definition, start: number): Token {
    const innerStart = this.index;
    const endSequence = match.end;
    const isMultiline = match.multiline;
    const escapeCharacter = match.escape;
    const tokens: Array<Token> = [];

    while (!this.finished) {
      const nextChar = this.peek();

      // Handle escapes
      if (escapeCharacter && nextChar === escapeCharacter) {
        this.consume(); // escape char
        if (!this.finished) this.consume(); // escaped char
        continue;
      }

      // If there's a nested scope
      if (
        match.scope &&
        this.peek(match.scope.start.length) === match.scope.start
      ) {
        const scopeStart = this.index;
        this.consume(match.scope.start.length);

        const scopeTokens = this._tokenizeScope(match.scope);
        const scopeEnd = this.index;
        tokens.push({
          type: match.scope.type,
          start: scopeStart,
          end: scopeEnd,
          innerStart: scopeStart + match.scope.start.length,
          innerEnd: scopeEnd - match.scope.end.length,
          tokens: scopeTokens
        });
        continue;
      }

      // Check for end
      if (this.peek(endSequence.length) === endSequence) {
        this.consume(endSequence.length);
        break;
      }

      // If single‐line, break on newline
      if (!isMultiline && nextChar === "\n") {
        this.consume();
        break;
      }

      this.consume();
    }

    const innerEnd = this.index - endSequence.length;
    const end = this.index;

    return {
      type: match.type,
      start,
      end,
      innerStart,
      innerEnd,
      tokens
    };
  }

  private _tokenizeScope(scope: Definition): Array<Token> {
    const tokens: Array<Token> = [];

    while (!this.finished) {
      const char = this.peek();

      if (scope.escape && char === scope.escape) {
        this.consume();
        if (!this.finished) this.consume();
        continue;
      }

      if (this.peek(scope.end.length) === scope.end) {
        this.consume(scope.end.length);
        break;
      }

      const token = this._tokenizeSingle();
      if (token) {
        tokens.push(token);
      }
    }

    return tokens;
  }
}

export function fallbackTokenizer(
  content: string,
  regexs: Array<RegExp>
): Array<Token> {
  const tokens: Array<Token> = [];
  let currentIndex = 0;

  while (currentIndex < content.length) {
    let matchIndex = content.length;
    let matchedLength = 0;

    // Find next matching regex
    for (const regex of regexs) {
      regex.lastIndex = currentIndex;
      const match = regex.exec(content);
      if (match && match.index >= currentIndex && match.index < matchIndex) {
        matchIndex = match.index;
        matchedLength = match[0].length;
      }
    }

    // Everything before the delimiter is one token
    if (currentIndex < matchIndex) {
      tokens.push({
        type: "fallback",
        start: currentIndex,
        end: matchIndex,
        innerStart: currentIndex,
        innerEnd: matchIndex,
        tokens: []
      });
    }

    // Skip the delimiter itself
    currentIndex = matchIndex + matchedLength;
  }

  return tokens;
}
