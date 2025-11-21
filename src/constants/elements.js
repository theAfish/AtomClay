export const ELEMENT_DATA = {
    "H": { color: 0xFFFFFF, radius: 0.37 }, "Li": { color: 0xCC80FF, radius: 1.34 }, "C": { color: 0x909090, radius: 0.77 },
    "N": { color: 0x3050F8, radius: 0.75 }, "O": { color: 0xFF0D0D, radius: 0.73 }, "F": { color: 0x90E050, radius: 0.71 },
    "Na": { color: 0xAB5CF2, radius: 1.54 }, "Mg": { color: 0x8AFF00, radius: 1.30 }, "Al": { color: 0xBFA6A6, radius: 1.18 },
    "Si": { color: 0xF0C8A0, radius: 1.11 }, "P": { color: 0xFF8000, radius: 1.06 }, "S": { color: 0xFFFF30, radius: 1.02 },
    "Cl": { color: 0x1FF01F, radius: 0.99 }, "K": { color: 0x8F40D4, radius: 1.96 }, "Ca": { color: 0x3DFF00, radius: 1.74 },
    "Ti": { color: 0xbfc2c7, radius: 1.36 }, "V": { color: 0xA6A6AB, radius: 1.34 }, "Cr": { color: 0x8A99C7, radius: 1.28 },
    "Mn": { color: 0x9C7AC7, radius: 1.27 }, "Fe": { color: 0xE06633, radius: 1.25 }, "Co": { color: 0xF090A0, radius: 1.26 },
    "Ni": { color: 0x50D050, radius: 1.21 }, "Cu": { color: 0xC88033, radius: 1.38 }, "Zn": { color: 0x7D80B0, radius: 1.31 },
    "Ga": { color: 0xC28F8F, radius: 1.26 }, "Ge": { color: 0x668F8F, radius: 1.22 }, "As": { color: 0xBD80E3, radius: 1.19 },
    "Se": { color: 0xFFA100, radius: 1.16 }, "Br": { color: 0xA62929, radius: 1.14 }, "Ag": { color: 0xC0C0C0, radius: 1.53 },
    "Au": { color: 0xFFD123, radius: 1.44 }, "Pt": { color: 0xD0D0E0, radius: 1.38 }, "Pb": { color: 0x575961, radius: 1.75 },
    "Default": { color: 0xFF00FF, radius: 1.0 }
};

export const getElementProp = (el) => ELEMENT_DATA[el] || ELEMENT_DATA["Default"];

export const DEMO_POSCAR = `TiO2 Rutile
1.0
4.5937 0.0000 0.0000
0.0000 4.5937 0.0000
0.0000 0.0000 2.9587
Ti O
2 4
Direct
0.00000 0.00000 0.00000
0.50000 0.50000 0.50000
0.30480 0.30480 0.00000
0.69520 0.69520 0.00000
0.80480 0.19520 0.50000
0.19520 0.80480 0.50000`;
