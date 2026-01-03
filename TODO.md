## 🎯 Project Overview: Interactive Lattice Transformer

**Objective**: To develop a high-performance, intuitive mouse-driven interface for manipulating crystal/molecular lattice parameters directly in a 3D Web environment.

Instead of typing values into input boxes, users can interact with a "Lattice Gizmo" (the bounding box). The system differentiates between **Scaling** (axial stretching) and **Shearing** (tilting) based on the specific geometric feature (Face, Edge, or Vertex) the user grabs. To ensure precision, the system implements an **Interaction Interlock** that freezes camera rotation while a manipulation is in progress. This transforms 2D screen-space mouse movements into complex 3D **Affine Transformations**, enabling real-time structural optimization and strain engineering.

---

## 🛠️ TODO: Interactive Lattice Manipulation Module

### Phase 1: Interaction Control & State Management

*Goal: Manage the "lock-and-key" relationship between camera movement and lattice manipulation.*

* [ ] **Viewport Lock Mechanism**:
* Implement a `LatticeInteracting` state flag.
* Create a toggle to disable/enable camera controls (e.g., `controls.enabled = false` in Three.js) when a manipulation starts.


* [ ] **Event Lifecycle Hooks**:
* `onPointerDown`: Check for intersection; if a handle is hit, lock the camera and record initial mouse/lattice states.
* `onPointerUp`: Release the camera lock and commit the transformation to the history stack.


* [ ] **Cursor State Manager**:
* Dynamically switch CSS cursors to indicate availability (hover) and active state (dragging).



### Phase 2: Core Geometry & Raycasting Engine

*Goal: Identify which part of the lattice box the user is interacting with.*

* [ ] **Define Hit-Zone Geometry**:
* Create invisible "Interaction Proxies" (larger hitboxes) for faces, edges, and vertices to make mouse selection easier.


* [ ] **Multi-Zone Raycaster**:
* Implement a raycaster that returns the specific component ID (`FACE_XY`, `EDGE_Z`, etc.) and the exact intersection point in 3D space.


* [ ] **Visual Feedback System (Hover State)**:
* Highlight the active face/edge/corner on hover using a highlight shader or wireframe overlay.



### Phase 3: Mathematical Utility Modules (Reusable)

*Goal: Create pure functions to handle the linear algebra of lattice deformation.*

* [ ] **Lattice Matrix Transformer**:
* Write a module to update the  Lattice Matrix  based on scaling and shearing inputs.


* [ ] **Coordinate Mapping Functions**:
* `ScreenToWorldDelta`: Convert 2D mouse displacement () into 3D world space vectors relative to the camera plane.
* `ProjectDeltaToAxis`: Project a 3D movement vector onto a specific lattice vector ().


* [ ] **Fractional-Cartesian Synchronizer**:
* Implement a toggle to decide if atoms move with the lattice (fixed fractional coordinates) or stay put (fixed Cartesian coordinates).



### Phase 4: Interaction Logic Implementation

*Goal: Map mouse movements to specific physical deformations.*

* [ ] **Face-Center Scaling Logic**:
* **Action**: Click face center -> Drag along normal.
* **Logic**: Apply scaling along the face's normal vector. Update the magnitude of the corresponding lattice vector.


* [ ] **Side-Edge Shearing Logic**:
* **Action**: Click near the edge of a face -> Drag parallel to the face.
* **Logic**: Apply a shear strain. If on face  and dragging towards , modify the off-diagonal elements of the lattice matrix.


* [ ] **Edge-Specific Dual-Mode Interaction**:
* **Mode A (Parallel Drag)**: Dragging along the edge direction triggers a **Shear** relative to the parallel plane.
* **Mode B (Perpendicular Drag)**: Dragging perpendicular to the edge triggers a **Diagonal Distortion** (e.g., transforming a square base into a rhombus).



### Phase 5: UI/UX & Integration

*Goal: Polish the experience and integrate with the Web environment.*

* [ ] **Constraint & Snapping System**:
* Add "Snap to Integer" for cell lengths or "Snap to 90°/45°" for lattice angles ().


* [ ] **State History (Undo/Redo)**:
* Capture snapshots of the lattice matrix for the undo stack.


* [ ] **Real-time Stats Overlay**:
* Show a floating tooltip with real-time updates of cell parameters ( and ) during the drag.



---

### 💡 Implementation Tip for Viewport Locking

If you are using **Three.js**, the standard way to handle the locking in your `onPointerDown` handler is:

```javascript
function onPointerDown(event) {
    const intersects = raycaster.intersectObjects(interactionProxies);
    if (intersects.length > 0) {
        this.isDragging = true;
        this.orbitControls.enabled = false; // Lock the viewport
        this.activeHandle = intersects[0].object;
        // ... record initial positions
    }
}

// And remember to turn it back on
function onPointerUp() {
    this.isDragging = false;
    this.orbitControls.enabled = true; // Unlock the viewport
}

