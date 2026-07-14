# AtomClay

AtomClay is a local atomic-structure modeling toolkit with a React frontend and a dependency-free Python core.

## JavaScript package

```bash
npm install atomclay
```

Build the reusable frontend bundle with `npm run build:lib`. The public API exposes parsers, lattice operations, POSCAR export, and the React context providers. Import the stylesheet from `atomclay/styles.css` when embedding the full UI.

## Python package

```bash
pip install .
```

The Python package exposes `Atom` and `Structure` from `atomclay`. It supports lattice scaling, vacuum insertion, periodic wrapping, and XYZ export without third-party runtime dependencies.

## Development

- `npm run dev` starts the demo application.
- `npm run build` builds the demo application.
- `npm run build:lib` builds the installable JavaScript library.
- `npm test` runs the test suite.
