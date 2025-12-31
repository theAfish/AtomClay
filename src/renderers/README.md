Renderers
=========

This folder contains renderer implementations that encapsulate rendering logic
separately from the UI components. The goal is to allow swapping or adding
different renderers (e.g., WebGL-based, Canvas2D, remote renderers) in the
future without cluttering `Viewer.jsx`.

Provided files:
- `threeRenderer.js`: a Three.js based renderer factory exposing a small API:
  - `init(container, { onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice })` — initialize scene
  - `syncScene({ atoms, lattice, layers, activeLayerId, theme })` — rebuild atoms/bonds/lattice
  - `updateSelection(selectedAtomIds, atoms)` — update selection visuals
  - `setTransformMode(transformMode, editMode)` — configure TransformControls
  - `dispose()` — teardown resources

  Additionally, there is a new shader-based renderer implementation:
  - `customShaders.js`: contains GLSL vertex/fragment strings and helper functions to create ShaderMaterials for atoms and bonds. These expose `createAtomMaterial` and `createBondMaterial`.
  - `customRenderer.js`: a renderer factory (`createCustomRenderer`) that uses the shader materials to render atoms and bonds using `InstancedMesh` and the same general API as `threeRenderer`.
    - Note: to use the shader renderer in the app, choose one of the shader variants in the renderer dropdown (Floating Controls): `Cartoon` or `Plastic`.
      The context's `renderers` list includes `custom` as `Shader`; the `Viewer` will re-initialize the renderer when the dropdown is changed.

How to migrate `Viewer.jsx` to use the renderer API
--------------------------------------------------
1. Import factory: `import { createThreeRenderer } from '../renderers';`
2. Create an instance: `const renderer = createThreeRenderer();`
3. On mount: `renderer.init(containerRef.current, callbacksAndOptions);` and assign
   the returned `threeRef` to any hooks that expect it (e.g. gizmo / selection hooks).
4. When atoms/lattice/layers change: call `renderer.syncScene({...})`.
5. When selection changes: call `renderer.updateSelection(...)`.
6. On unmount: call `renderer.dispose()`.

Notes
-----
- The current implementation mirrors the rendering behavior in `Viewer.jsx`.
- The implementation is intentionally self-contained and can be extended to
  expose more hooks/events (e.g., per-frame callbacks) or to provide alternate
  renderer backends.




✅ Plastic style implemented in `customShaders.js` (use `style: 'plastic'`).
- How to enable:
  - At init: `renderer.init(container, { ..., atomStyle: 'plastic' })`
  - Or at runtime: `renderer.setAtomStyle('plastic')`

This shader uses a half-Lambert diffuse term, Blinn-Phong-like specular for a "plastic" look, and a Fresnel-based dark rim to give crisp black outlines.