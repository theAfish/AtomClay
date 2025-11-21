export const MathUtils = {
    multiplyMatrixVector: (m, v) => [
        m[0][0]*v[0] + m[1][0]*v[1] + m[2][0]*v[2],
        m[0][1]*v[0] + m[1][1]*v[1] + m[2][1]*v[2],
        m[0][2]*v[0] + m[1][2]*v[1] + m[2][2]*v[2]
    ],
    det3x3: (m) => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]),
    inv3x3: (m) => {
        const det = MathUtils.det3x3(m);
        if (Math.abs(det) < 1e-8) return null;
        const invDet = 1 / det;
        return [
            [(m[1][1]*m[2][2]-m[1][2]*m[2][1])*invDet, (m[0][2]*m[2][1]-m[0][1]*m[2][2])*invDet, (m[0][1]*m[1][2]-m[0][2]*m[1][1])*invDet],
            [(m[1][2]*m[2][0]-m[1][0]*m[2][2])*invDet, (m[0][0]*m[2][2]-m[0][2]*m[2][0])*invDet, (m[0][2]*m[1][0]-m[0][0]*m[1][2])*invDet],
            [(m[1][0]*m[2][1]-m[1][1]*m[2][0])*invDet, (m[0][1]*m[2][0]-m[0][0]*m[2][1])*invDet, (m[0][0]*m[1][1]-m[0][1]*m[1][0])*invDet]
        ];
    },
    matMul3x3: (a, b) => {
        const r = [[0,0,0],[0,0,0],[0,0,0]];
        for(let i=0;i<3;i++) for(let j=0;j<3;j++) for(let k=0;k<3;k++) r[i][j]+=a[i][k]*b[k][j];
        return r;
    }
};
