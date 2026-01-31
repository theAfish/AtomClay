# Frontend Refactoring TODOs

This document outlines the weaknesses identified in the current frontend codebase and provides a roadmap for refactoring to improve maintainability and collaboration.

## 1. `MolecularContext.jsx` Refactoring (High Priority)
The `MolecularContext` is currently a "God Object" handling too many responsibilities (State, Parsing, API calls, Selection Logic).

- [x] **Extract File Parsing Logic**: 
    - Move the massive inline parsing logic (especially the `POSCAR` parser) from `parseFile` into a dedicated `src/utils/parsers/` directory (e.g., `poscarParser.js`, `xyzParser.js`).
    - The `parseFile` function in the context should only delegate to these utilities.
- [x] **Extract File I/O Logic**:
    - Create a custom hook `useFileImportExport` that handles the `importFile`, `handleLoad`, and `handleDownload` logic.
    - This hook should consume `MolecularContext` but keep the logic out of the provider file.
- [x] **Separate UI State from Domain State**:
    - The `MolecularContext` mixes heavy domain data (`atoms`, `lattice`, `layers`) with transient UI state (`isChatOpen`, `showRendererDropdown`, `editMode`).
    - **Action**: Create a separate `UIContext` for things like sidebar toggles, theme, and view modes. Keep `MolecularContext` strictly for scientific data.

## 2. Component Structure & logic separation (Medium Priority)
The `src/components/operations` folder mixes UI forms with complex business logic.

- [x] **Standardize Operations**:
    - Move logic handlers (like `latticeHandlers.js`, `transformHandlers.js`) out of `src/components/` and into a `src/domain/` or `src/logic/` directory.
    - Ensure components are purely presentational or containers that call these logic functions.
- [x] **Refactor `Viewer.jsx`**:
    - This component manages raw Three.js state (`threeRef`), hooks, and event listeners.
    - Break it down:
        - `ViewerCanvas.jsx`: Pure wrapper for the canvas and resize logic.
        - `ViewerScene.jsx`: Manages the Three.js scene graph.
        - `ViewerControls.jsx`: Manages `OrbitControls` `TransformControls`.
    - Avoid passing the mutable `threeRef` deep into helper functions. Consider a `ThreeContext` if many components need access to the scene, or strictly encapsulate Three.js logic in custom hooks (e.g., `useThreeScene`, `useThreeControls`).

## 3. Code Organization (Medium Priority)
The current structure is a bit flat and "type-based" (components, hooks) rather than "feature-based".

- [x] **Reorganize `src/components`**:
    - Instead of `components/operations` and `components/UI`, align by feature:
        - `components/Lattice/` (Forms, handlers, gizmos)
        - `components/Atom/` (Selection, manipulation)
        - `components/Workspace/` (Chat, Panels, Layout)
        - `components/Common/` (Generic Buttons, Inputs, ErrorBanner)

## 4. Hardcoded Constants & Configuration (Low Priority)
- [x] **Centralize Defaults**:
    - Ensure all magic numbers (colors, default lattice sizes, camera positions) are in `src/constants/`.
    - `MolecularContext` contains some inline default objects that should be moved.

## 5. Performance Improvements
- [ ] **Optimize Context Updates**:
    - Currently, `MolecularContext` updates might cause re-renders of the whole app for small changes (like `isChatOpen` toggling).
    - Splitting the context (as mentioned in point 1) will solve this.
    - Use `useMemo` for derived data like `visibleAtoms` (already partially done, but verify deps).

## 6. Collaboration Standards
- [ ] **Add Prop Validation**:
    - Since this is JS (not TS), mostly missing `PropTypes` makes it hard to know what components expect.
    - **Action**: Add `prop-types` to all shared components.
- [ ] **Environment Variables**:
    - Ensure API endpoints in `vite.config.js` or services are configurable via `.env` files.

---

**Next Steps:**
1. Start with **Step 1** (Parsing extraction) as it is the safest and yields immediate code reduction in the context.
2. Proceed to split the Context.
