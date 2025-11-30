export const DEFAULTS = {
    LATTICE: [[10, 0, 0], [0, 10, 0], [0, 0, 10]],
    CAMERA: {
        POSITION: [25, 30, 20],
        TARGET: [5, 5, 5],
        FOV: 45,
        NEAR: 0.1,
        FAR: 1000,
    },
    LIGHTING: {
        AMBIENT_INTENSITY: 0.6,
        DIRECTIONAL_POSITION: [10, 10, 10],
        DIRECTIONAL_INTENSITY: 1,
    },
    VISUALS: {
        ATOM_SCALE: 0.4,
        SPHERE_SEGMENTS: 24,
        BOND_RADIUS: 0.1,
        BOND_SEGMENTS: 6,
        BOND_THRESHOLD_FACTOR: 0.6,
    },
    INTERACTION: {
        CLICK_DISTANCE_THRESHOLD: 5,
        DRAG_DELAY: 100,
    },
    PERFORMANCE: {
        INSTANCED_MESH_THRESHOLD: 10000,
    },
    HISTORY: {
        MAX_LENGTH: 100,
    }
};
