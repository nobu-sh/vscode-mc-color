# Minecraft Colorer
`mc-color` is an extension that will format Minecraft color escape characters (§) in the editor.

![](https://images-ext-1.discordapp.net/external/qTpIe1A0_ahiROM8LeJcn3tmjS7sycnjUL8gemWnoMo/https/media.discordapp.net/attachments/854093453743226920/957828771447210044/unknown.png)

## Configuration
The default configuration is:

```jsonc
{
  // Whether the extension is enabled or not.
  "mc-color.enabled": true,

  // Marker type provides a few means of highlighting text.
  "mc-color.markerType": "foreground",

  // Specfic languages to highlight on.
  // You can also do "!language" to not tokenize just that language.
  "mc-color.languages": [
    "*"
  ],

  // Delimiters are characters that are used to STOP tokenization.
  // When the tokenizer hits these character it will not color any further
  // no matter what.
  "mc-color.delimiters": [
    "`"
  ],

  // Prefixes are characters that will start tokenization. (§) is the
  // default Minecraft token and (&) is used for many server tools.
  "mc-color.prefixes": [
    "§",
    "&"
  ]
}
```

You can edit these settings by navigating to vscode settings: `⚙ -> settings` and searching `mc-color` in the search bar at the top!

## Known Issues and Their Current Fixes.

### Over Tokenization

There is no direct way the plugin can tell when not to color anymore when if you dont end the string with `§r`.

EG:

`Ending string without §r`

![](https://media.discordapp.net/attachments/646099378242715668/957831612970725417/unknown.png)

`Ending the string with §r`

![](https://media.discordapp.net/attachments/646099378242715668/957831747633049640/unknown.png)


We also implemented "delimiters" (can be configured in settings). The way it works is you can provide an array of 1 byte characters and if it hits one of those during tokenization it will stop.

By default we have backtick (`) set which will as shown in this screenshot stop tokenization without all the excess coloring occuring like shown above:

![](https://media.discordapp.net/attachments/920500198407565349/957841004134801448/unknown.png)

In conclusion, to avoid this issue either

1. End your strings with `§r`
2. Add delimiters that will force stop tokenization.

If anyone has an idea on how to avoid this feel free to pull request!
