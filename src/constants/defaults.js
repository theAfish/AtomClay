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
        AMBIENT_INTENSITY: 1.0,
        DIRECTIONAL_POSITION: [10, 10, 10],
        DIRECTIONAL_INTENSITY: 1.5,
    },
    VISUALS: {
        ATOM_SCALE: 0.4,
        SPHERE_SEGMENTS: 32,
        BOND_RADIUS: 0.1,
        BOND_SEGMENTS: 12,
        BOND_THRESHOLD_FACTOR: 0.6,
    },
    INTERACTION: {
        CLICK_DISTANCE_THRESHOLD: 5,
        DRAG_DELAY: 100,
    },
    PERFORMANCE: {
        INSTANCED_MESH_THRESHOLD: 10000,
        BOND_MESH_THRESHOLD: 500, // max atoms to attempt naive bond generation
    },
    HISTORY: {
        MAX_LENGTH: 100,
    }
};
