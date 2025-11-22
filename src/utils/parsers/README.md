# Parser registry (dev guide)

This folder contains the parser registry and example parsers used by AtomClay.

Overview
- `index.js` — Parser registry, `detectFormat(text, filename)`, and `parse(text, format?)` helper. Built-in parsers are registered here.
- `pdbParser.js` — Minimal PDB parser that returns the normalized structure shape.
- `xyzParser.js` — Minimal XYZ parser that supports lattice extraction from the comment line.

Normalized structure shape
- `{ atoms: Array, lattice: null | [[a,b,c],[d,e,f],[g,h,i]], metadata?: { format } }`
- `atoms` entries: `{ id: number|string, element: string, x: number, y: number, z: number, layerId?: string }`

How to add a new parser
1. Create a new file `src/utils/parsers/<fmt>Parser.js` exporting an async `parse(text)` function that returns the normalized structure object.
2. In `src/utils/parsers/index.js` import and call `registerParser('<fmt>', parserModule)` or rely on the module to be imported and registered by index.js.
3. Optionally add a detection heuristic in `detectFormat(text, filename)` to auto-detect the format by content or extension.

API notes
- `parse(text, format)` — returns a Promise resolving to `{ atoms, lattice, metadata }`. If `format` omitted, `detectFormat` is used.
- `registerParser(name, impl)` — registers a parser where `impl.parse(text)` is a function that returns the normalized shape.

Mol* adapter
Mol* expects PDB-like text. The `MolstarViewer` component accepts the normalized `structure` prop and converts it to a minimal PDB string before passing it to Mol*.

Testing
- Add unit tests that call your parser directly with representative sample files and assert the returned shape (atoms count, lattice shape, first/last atom coords).
