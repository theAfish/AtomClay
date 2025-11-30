# Refactoring & Improvement TODO List

## 1. Architecture & State Management
- [x] **Extract State Logic from App.jsx**: Create a custom hook `useMolecularState` to manage:
    - Atoms list
    - Lattice configuration
    - Layers management
    - Undo/Redo history stack
- [x] **Implement Context/Store**: Introduce a React Context or a library like Zustand to avoid prop drilling into `LeftPanel` and `RightPanel`.
- [x] **Decouple UI from Logic**: Ensure `App.jsx` only handles layout and high-level composition, not business logic.

## 2. Code Modularization
- [ ] **Refactor POSCAR Parser**:
    - Move the inline POSCAR parsing logic from `App.jsx` (lines ~130-190) to `src/utils/parsers/poscarParser.js`.
    - Register it in `src/utils/parsers/index.js`.
- [ ] **Isolate Crystallography Operations**:
    - Create `src/utils/structureOperations.js`.
    - Move `handleSupercell`, `handleVacuum`, and `handleScaleLattice` logic there.
    - Ensure these functions are pure (take atoms/lattice, return new atoms/lattice) and testable.
- [ ] **Viewer Component Split**:
    - Extract the Gizmo/Orientation Axis drawing logic from `Viewer.jsx` into a separate component or hook (`useGizmo`).
    - Separate the "Box Selection" logic into a `useBoxSelection` hook.

## 3. Code Quality & Best Practices
- [ ] **Type Safety**:
    - Add JSDoc comments to all utility functions (especially in `math.js` and parsers).
    - *Long-term*: Migrate `.js/.jsx` files to TypeScript (`.ts/.tsx`) to define interfaces for `Atom`, `Lattice`, and `Layer`.
- [ ] **Constants Management**:
    - Move hardcoded colors (e.g., `#0f172a`, `#f1f5f9`) to `src/constants/theme.js` or use Tailwind config variables consistently.
    - Move magic numbers (default lattice size, camera positions) to `src/constants/defaults.js`.
- [ ] **Error Handling**:
    - Improve error messages in parsers.
    - Add an Error Boundary component to catch React rendering errors in the Viewer.

## 4. Testing
- [ ] **Unit Tests**: Add unit tests (using Vitest/Jest) for:
    - `src/utils/math.js` (Matrix operations are critical).
    - `src/utils/parsers/*.js` (Ensure all file formats parse correctly).
    - New `structureOperations.js` functions.

## 5. Performance
- [ ] **Memoization**: Review `Viewer.jsx` to ensure `threeRef` updates don't cause unnecessary re-renders.
- [ ] **Large System Optimization**: If atom count > 10,000, consider using `THREE.InstancedMesh` for atoms instead of individual Meshes (currently used for bonds, but atoms use individual meshes).
