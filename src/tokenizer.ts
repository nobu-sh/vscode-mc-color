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
      .filter((definition) => {
        return definition.start.startsWith(start);
      })
      .map((definition) => {
        if (definition.start === start) {
          return { ...definition, directMatch: true };
        }

        return definition;
      });
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
      if (token) {
        tokens.push(token);
      }
    }

    return tokens;
  }

  private _tokenizeSingle(): Token | null {
    const start = this.index;
    const char = this.consume();
    let matches = this.searchDefinitions(char);

    if (matches.length === 0) {
      return null; // No valid match found, continue tokenizing
    }

    let match: Definition | null = null;
    let consumed = char;

    while (matches.length > 1 && !this.finished) {
      const exactMatch = matches.find((def) => def.directMatch);
      if (exactMatch) {
        match = exactMatch;
      }

      consumed += this.consume();
      matches = this.searchDefinitions(consumed);
    }

    if (!match && matches[0]?.directMatch) {
      match = matches[0];
    } else {
      return null; // No match found, continue tokenizing
    }

    // Now handle the token, and check if it has a scope
    return this._createToken(match, start);
  }

  private _createToken(match: Definition, start: number): Token {
    const innerStart = this.index;
    const endSequence = match.end;
    const isMultiline = match.multiline;
    const escapeCharacter = match.escape; // Escape character can be undefined

    const tokens: Array<Token> = []; // Initialize child tokens

    while (!this.finished) {
      const nextChar = this.peek();

      // Only handle escape if an escape character is defined
      if (escapeCharacter && nextChar === escapeCharacter) {
        this.consume(); // Consume the escape character
        this.consume(); // Consume the escaped character
        continue;
      }

      // Handle scope if it exists
      if (
        match.scope &&
        this.peek(match.scope.start.length) === match.scope.start
      ) {
        const scopeStart = this.index; // Track start of the scope
        this.consume(match.scope.start.length); // Consume the scope start characters

        // Tokenize the content inside the scope
        const scopeTokens = this._tokenizeScope(match.scope);
        const scopeEnd = this.index; // Track the end of the scope

        // Push the scope token with correct start/end positions
        tokens.push({
          type: match.scope.type,
          start: scopeStart,
          end: scopeEnd,
          innerStart: scopeStart + match.scope.start.length,
          innerEnd: scopeEnd - match.scope.end.length,
          tokens: scopeTokens
        });

        continue; // Continue after handling the scope
      }

      // If we're not in an escaped state, check for the end sequence
      if (this.peek(endSequence.length) === endSequence) {
        this.consume(endSequence.length);
        break;
      }

      // If it's not a multiline definition, break on newlines
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
      tokens // Return the child tokens including the nested scopes
    };
  }

  private _tokenizeScope(scope: Definition): Array<Token> {
    const tokens: Array<Token> = [];

    while (!this.finished) {
      const char = this.peek();

      // Handle escape characters inside the scope
      if (scope.escape && char === scope.escape) {
        this.consume(); // Consume escape
        this.consume(); // Consume escaped character
        continue;
      }

      // If we find the scope's end, exit
      if (this.peek(scope.end.length) === scope.end) {
        this.consume(scope.end.length);
        break;
      }

      // Recursively tokenize the content inside the scope
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

    // Find the next matching regex pattern
    for (const regex of regexs) {
      regex.lastIndex = currentIndex; // Start matching from current position
      const match = regex.exec(content);

      if (match && match.index >= currentIndex && match.index < matchIndex) {
        matchIndex = match.index;
        matchedLength = match[0].length;
      }
    }

    // Add token for the content before the matched regex (delimiter)
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

    // Move past the delimiter, no token is created for the delimiter itself
    currentIndex = matchIndex + matchedLength;
  }

  return tokens;
}
