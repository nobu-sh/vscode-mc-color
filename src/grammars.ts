/*
  I am too lazy to implement textmate and oniguruma. So we are going to
  manually define grammars for every language here.

  Grammars need to understand the following:
  - Comment start location
  - Comment end location

  - String start location
  - String end location
  - Scope information for template strings

  Languages with nothing defined will fallback to the fallbackRegex in the config.
  Feel free to contribute more languages, its pretty easy I think.
*/

import { Grammar } from "./grammar";

export const Grammars = new Map<string, Grammar>();
export const register = (grammar: Grammar) =>
  Grammars.set(grammar.languageId, grammar);

export const JavaScript = new Grammar("javascript")
  .addDefinition(Grammar.comment("block"), {
    start: "/*",
    end: "*/",
    multiline: true
  })
  .addDefinition(Grammar.comment("line"), { start: "//", end: "\n" })
  .addDefinition(Grammar.string("quote.single"), {
    start: "'",
    end: "'",
    escape: "\\"
  })
  .addDefinition(Grammar.string("quote.double"), {
    start: '"',
    end: '"',
    escape: "\\"
  })
  .addDefinition(Grammar.string("template"), {
    start: "`",
    end: "`",
    multiline: true,
    escape: "\\",
    scope: {
      type: Grammar.scope("template"),
      start: "${",
      end: "}",
      multiline: true,
      escape: "\\"
    }
  });
register(JavaScript);
register(JavaScript.clone("typescript"));
register(JavaScript.clone("javascriptreact"));
register(JavaScript.clone("typescriptreact"));

export const Java = new Grammar("java")
  .addDefinition(Grammar.comment("block"), {
    start: "/*",
    end: "*/",
    multiline: true
  })
  .addDefinition(Grammar.comment("line"), { start: "//", end: "\n" })
  .addDefinition(Grammar.string("quote.single"), {
    start: "'",
    end: "'",
    escape: "\\"
  })
  .addDefinition(Grammar.string("quote.double"), {
    start: '"',
    end: '"',
    escape: "\\"
  })
  .addDefinition(Grammar.string("block"), {
    start: '"""',
    end: '"""',
    multiline: true,
    escape: "\\"
  });
register(Java);

export const Kotlin = new Grammar("kotlin")
  .addDefinition(Grammar.comment("block"), {
    start: "/*",
    end: "*/",
    multiline: true
  })
  .addDefinition(Grammar.comment("line"), { start: "//", end: "\n" })
  .addDefinition(Grammar.string("quote.single"), {
    start: "'",
    end: "'",
    escape: "\\"
  })
  .addDefinition(Grammar.string("interpolated"), {
    start: '"',
    end: '"',
    escape: "\\",
    scope: {
      type: Grammar.scope("template"),
      start: "${",
      end: "}",
      multiline: true,
      escape: "\\"
    }
  })
  .addDefinition(Grammar.string("block"), {
    start: '"""',
    end: '"""',
    multiline: true,
    escape: "\\"
  });
register(Kotlin);

export const PHP = new Grammar("php")
  .addDefinition(Grammar.comment("block"), {
    start: "/*",
    end: "*/",
    multiline: true
  })
  .addDefinition(Grammar.comment("line"), {
    start: "//",
    end: "\n"
  })
  .addDefinition(Grammar.string("quote.single"), {
    start: "'",
    end: "'",
    escape: "\\"
  })
  .addDefinition(Grammar.string("quote.double"), {
    start: '"',
    end: '"',
    escape: "\\"
  })
  .addDefinition(Grammar.string("heredoc"), {
    start: "<<<",
    end: "\n", // Heredoc strings end with a newline followed by a closing identifier
    multiline: true
  })
  .addDefinition(Grammar.string("nowdoc"), {
    start: "<<<'",
    end: "\n", // Nowdoc ends similarly to heredoc but is treated like a single-quoted string (no interpolation)
    multiline: true
  })
  .addDefinition(Grammar.string("interpolated"), {
    start: '"',
    end: '"',
    escape: "\\",
    scope: {
      type: Grammar.scope("interpolated"),
      start: "${",
      end: "}",
      escape: "\\"
    }
  });
register(PHP);

export const Rust = new Grammar("rust")
  .addDefinition(Grammar.comment("block"), {
    start: "/*",
    end: "*/",
    multiline: true
  })
  .addDefinition(Grammar.comment("line"), {
    start: "//",
    end: "\n"
  })
  .addDefinition(Grammar.string("quote.single"), {
    start: "'",
    end: "'",
    escape: "\\"
  })
  .addDefinition(Grammar.string("quote.double"), {
    start: '"',
    end: '"',
    escape: "\\"
  })
  .addDefinition(Grammar.string("raw"), {
    start: 'r#"',
    end: '"#',
    multiline: true
    // No escape property since rust raw strings don't support escape sequences
  });
register(Rust);

export const Go = new Grammar("go")
  .addDefinition(Grammar.comment("block"), {
    start: "/*",
    end: "*/",
    multiline: true
  })
  .addDefinition(Grammar.comment("line"), {
    start: "//",
    end: "\n"
  })
  .addDefinition(Grammar.string("quote.single"), {
    start: "'",
    end: "'",
    escape: "\\"
  })
  .addDefinition(Grammar.string("quote.double"), {
    start: '"',
    end: '"',
    escape: "\\"
  })
  .addDefinition(Grammar.string("raw"), {
    start: "`",
    end: "`",
    multiline: true
    // No escape property since Go raw strings don't support escape sequences
  });
register(Go);
