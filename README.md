# Palworld UID Swap

This tool changes player UIDs in Palworld save files. It runs fully in your browser. The tool does not send your files to a server.

Use the tool for these tasks:

- Make a different player the host of a co-op world.
- Move a co-op world to a dedicated server.
- Move a character from one player to an other player in the same world.

The tool reads the current save format (magic `PlM`, Oodle Kraken compression, Palworld 0.6 and later). It also reads the older zlib formats (`PlZ`, `CNK`).

## Usage

1. Make a copy of the full save folder before you start.
2. Open the site.
3. Select your world's `Level.sav` file.
4. Select the `Players/*.sav` files that you want to change.
5. Set the new UID for each player. For a swap of two players, use the swap button.
6. Click "Swap IDs".
7. Download the new files.
8. Put the new files in the save folder. The tool gives the player files their correct new names. Delete the player files that have the old names.

A UID change moves the full save to the new identity. This includes the character, the inventory, the pals, and the map discoveries in the player file. This is correct for all mappings, including cycles of three or more players.

The file `LocalData.sav` holds the fog-of-war mask for one machine. It does not contain player UIDs. Do not change this file.

## How the tool operates

- The tool decompresses the `.sav` container. For Oodle data, it uses the [ooz](https://github.com/powzix/ooz) codec, compiled to WebAssembly.
- A JavaScript port of the [palworld-save-tools](https://github.com/cheahjs/palworld-save-tools) parser finds the position of each GUID in the file. This includes the GUIDs in the binary blocks for characters, guilds, map objects, containers, and work assignments.
- The tool writes the new UIDs at these positions. All other bytes stay the same.

## Build the WASM module

The repository contains the file `src/ooz/ooz.wasm`. To build it again:

```sh
git clone https://github.com/deafdudecomputers/PalworldSaveTools
# download wasi-sdk from https://github.com/WebAssembly/wasi-sdk/releases
OOZ_SRC=PalworldSaveTools/src/palsav/palooz/ooz/dep/ooz \
WASI_SDK=/path/to/wasi-sdk \
./tools/build-ooz.sh
```

## Tests

The script `test/compare.mjs` compares the tool's output with the output of the Python `palsav` pipeline on real save files. The file paths are machine-specific. Set the `ORIG_DIR` and `EXP_DIR` environment variables to use your own files.

## Credits

- [cheahjs/palworld-save-tools](https://github.com/cheahjs/palworld-save-tools): GVAS format research and the Python implementation
- [deafdudecomputers/PalworldSaveTools](https://github.com/deafdudecomputers/PalworldSaveTools): updated parsers and PlM/Oodle support
- [powzix/ooz](https://github.com/powzix/ooz): open-source Oodle codec
- [xNul/palworld-host-save-fix](https://github.com/xNul/palworld-host-save-fix): the first host-fix procedure

## License

GPL-3.0-or-later. This project builds on components that have the GPL license.
