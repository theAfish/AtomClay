export const VDW_RADII = {
    H: 1.2, Li: 1.82, C: 1.7,
    N: 1.55, O: 1.52, F: 1.47,
    Na: 2.27, Mg: 1.73, Al: 1.84,
    Si: 2.1, P: 1.8, S: 1.8,
    Cl: 1.75, K: 2.75, Ca: 2.31,
    Ti: 2.11, V: 2.07, Cr: 2.06,
    Mn: 2.05, Fe: 2.04, Co: 2.0,
    Ni: 1.63, Cu: 1.4, Zn: 1.39,
    Ga: 1.87, Ge: 2.11, As: 1.85,
    Se: 1.9, Br: 1.85, Ag: 1.72,
    Au: 1.66, Pt: 1.75, Pb: 2.02,
    Default: 2.0
};

export const getVdw = (el) => VDW_RADII[el] ?? VDW_RADII.Default;

export default {
    VDW_RADII,
    getVdw
};
