export interface Definition {
  type: string;
  start: string;
  end: string;
  // If multiline then it won't fallback to \n as the end defaults to false.
  multiline?: boolean;
  // Must be defined for handling escapes in definitions
  escape?: string;
  // Only needs to be provided for template string languages
  scope?: Definition;
}

export class Grammar {
  public definitions: Array<Definition> = [];

  public constructor(public readonly languageId: string) {}

  public static comment(id: string = ""): string {
    return `comment.${id}`;
  }

  public static string(id: string = ""): string {
    return `string.${id}`;
  }

  public static scope(id: string = ""): string {
    return `scope.${id}`;
  }

  public addDefinition(
    type: string,
    definition: Omit<Definition, "type">
  ): this {
    this.definitions.push({ type, ...definition });
    return this;
  }

  public addDefinitions(definitions: Array<Definition>): this {
    this.definitions.push(...definitions);
    return this;
  }

  public addDef = this.addDefinition;
  public addDefs = this.addDefinitions;

  public clone(languageId: string): Grammar {
    const grammar = new Grammar(languageId);
    grammar.definitions = structuredClone(this.definitions);
    return grammar;
  }
}
