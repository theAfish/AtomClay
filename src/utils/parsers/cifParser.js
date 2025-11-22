// Minimal CIF parser with Corrected Matrix Orientation
export async function parse(text) {
    const lines = text.split(/\r?\n/);
    const atoms = [];
    
    // 最终返回的 lattice 将是一个包含三个向量的数组：[VectorA, VectorB, VectorC]
    // 每个 Vector 是 [x, y, z]
    let lattice = null;

    // 1. Parse Cell Parameters
    const cell = { a: null, b: null, c: null, alpha: null, beta: null, gamma: null };
    
    const cleanFloat = (str) => {
        if (!str) return 0;
        const idx = str.indexOf('(');
        if (idx !== -1) return parseFloat(str.substring(0, idx));
        return parseFloat(str);
    };

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        const parts = line.split(/\s+/);
        const tag = parts[0];
        const val = parts[1];

        if (tag === '_cell_length_a') cell.a = cleanFloat(val);
        else if (tag === '_cell_length_b') cell.b = cleanFloat(val);
        else if (tag === '_cell_length_c') cell.c = cleanFloat(val);
        else if (tag === '_cell_angle_alpha') cell.alpha = cleanFloat(val);
        else if (tag === '_cell_angle_beta') cell.beta = cleanFloat(val);
        else if (tag === '_cell_angle_gamma') cell.gamma = cleanFloat(val);
    }

    // 2. Calculate Lattice Vectors (Corrected Orientation)
    // 这里的逻辑是计算出三个基矢量：vA, vB, vC
    let vA, vB, vC;

    if (cell.a && cell.b && cell.c && cell.alpha) {
        const toRad = Math.PI / 180;
        const alpha = cell.alpha * toRad;
        const beta = cell.beta * toRad;
        const gamma = cell.gamma * toRad;

        const cosAlpha = Math.cos(alpha);
        const cosBeta = Math.cos(beta);
        const cosGamma = Math.cos(gamma);
        const sinGamma = Math.sin(gamma);

        const term = (cosAlpha - cosBeta * cosGamma) / sinGamma;
        const v3zValue = Math.sqrt(Math.max(0, 1 - cosBeta * cosBeta - term * term));

        // 定义三个基矢量 (Row Vectors)
        // Vector A: 沿 X 轴
        vA = [cell.a, 0, 0];

        // Vector B: 在 XY 平面
        vB = [cell.b * cosGamma, cell.b * sinGamma, 0];

        // Vector C: 任意方向
        vC = [cell.c * cosBeta, cell.c * term, cell.c * v3zValue];

        // 【重要修改】: 这里的 lattice 现在是 [VectorA, VectorB, VectorC]
        // 方便你直接绘图：
        // lattice[0] 就是 a 轴向量
        // lattice[1] 就是 b 轴向量
        // lattice[2] 就是 c 轴向量
        lattice = [vA, vB, vC];
    }

    // 3. Parse Atoms
    let currentLoopHeaders = [];
    let insideAtomLoop = false;
    
    // 归一化：保证坐标在 [0, 1) 之间
    const normalize = (val) => ((val % 1) + 1) % 1;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('loop_')) {
            currentLoopHeaders = [];
            insideAtomLoop = false;
            continue;
        }

        if (line.startsWith('_')) {
            currentLoopHeaders.push(line);
            if (line === '_atom_site_fract_x') insideAtomLoop = true;
        } else if (insideAtomLoop) {
            const xIdx = currentLoopHeaders.indexOf('_atom_site_fract_x');
            const yIdx = currentLoopHeaders.indexOf('_atom_site_fract_y');
            const zIdx = currentLoopHeaders.indexOf('_atom_site_fract_z');
            const lblIdx = currentLoopHeaders.indexOf('_atom_site_label');
            const symIdx = currentLoopHeaders.indexOf('_atom_site_type_symbol');

            if (xIdx === -1 || yIdx === -1 || zIdx === -1) continue;

            const parts = line.split(/\s+/);
            if (parts[0].startsWith('data_') || parts[0].startsWith('loop_')) {
                insideAtomLoop = false;
                continue;
            }
            if (parts.length < currentLoopHeaders.length) continue;

            const fx = normalize(cleanFloat(parts[xIdx]));
            const fy = normalize(cleanFloat(parts[yIdx]));
            const fz = normalize(cleanFloat(parts[zIdx]));

            let element = symIdx >= 0 ? parts[symIdx] : '';
            const label = lblIdx >= 0 ? parts[lblIdx] : '';
            
            if (!element && label) {
                const raw = label.replace(/[^A-Za-z]/g, '');
                if (raw.length > 1 && raw[1] === raw[1].toLowerCase()) element = raw.substring(0, 2);
                else element = raw.substring(0, 1) || 'X';
            }

            // 坐标转换 (Cartesian Calculation)
            // P = fx * A + fy * B + fz * C
            let x = 0, y = 0, z = 0;
            if (lattice) {
                x = fx * vA[0] + fy * vB[0] + fz * vC[0];
                y = fx * vA[1] + fy * vB[1] + fz * vC[1];
                z = fx * vA[2] + fy * vB[2] + fz * vC[2];
            } else {
                x = fx; y = fy; z = fz;
            }

            atoms.push({ element, x, y, z });
        }
    }

    return { atoms, lattice };
}

export default { parse };