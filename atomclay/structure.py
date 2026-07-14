"""Small, dependency-free structure model suitable for Python applications."""

from dataclasses import dataclass, field
from math import floor, sqrt
from typing import List, Optional, Sequence, Tuple

Vector = Tuple[float, float, float]
Matrix = Tuple[Vector, Vector, Vector]


def _matrix(values: Sequence[Sequence[float]]) -> Matrix:
    if len(values) != 3 or any(len(row) != 3 for row in values):
        raise ValueError("lattice must be a 3x3 matrix")
    return tuple(tuple(float(value) for value in row) for row in values)  # type: ignore


def _det(m: Matrix) -> float:
    return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
            - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))


def _inverse(m: Matrix) -> Matrix:
    d = _det(m)
    if abs(d) < 1e-12:
        raise ValueError("lattice is singular")
    c = (
        (m[1][1] * m[2][2] - m[1][2] * m[2][1], m[0][2] * m[2][1] - m[0][1] * m[2][2], m[0][1] * m[1][2] - m[0][2] * m[1][1]),
        (m[1][2] * m[2][0] - m[1][0] * m[2][2], m[0][0] * m[2][2] - m[0][2] * m[2][0], m[0][2] * m[1][0] - m[0][0] * m[1][2]),
        (m[1][0] * m[2][1] - m[1][1] * m[2][0], m[0][1] * m[2][0] - m[0][0] * m[2][1], m[0][0] * m[1][1] - m[0][1] * m[1][0]),
    )
    return tuple(tuple(value / d for value in row) for row in c)  # type: ignore


def _mul(m: Matrix, v: Vector) -> Vector:
    return tuple(sum(m[i][j] * v[j] for j in range(3)) for i in range(3))  # type: ignore


@dataclass(frozen=True)
class Atom:
    element: str
    position: Vector


@dataclass
class Structure:
    atoms: List[Atom] = field(default_factory=list)
    lattice: Optional[Matrix] = None

    def __post_init__(self):
        self.atoms = [atom if isinstance(atom, Atom) else Atom(atom[0], tuple(atom[1])) for atom in self.atoms]
        if self.lattice is not None:
            self.lattice = _matrix(self.lattice)

    def copy(self) -> "Structure":
        return Structure(list(self.atoms), self.lattice)

    def scale_lattice(self, factors: Sequence[float]) -> "Structure":
        if len(factors) != 3 or any(float(value) <= 0 for value in factors):
            raise ValueError("scale factors must contain three positive values")
        if self.lattice is None:
            raise ValueError("lattice is required")
        return Structure(list(self.atoms), tuple(tuple(value * float(factors[i]) for value in row) for i, row in enumerate(self.lattice)))

    def add_vacuum(self, size: float, axis: int = 2) -> "Structure":
        if self.lattice is None:
            raise ValueError("lattice is required")
        if axis not in (0, 1, 2):
            raise ValueError("axis must be 0, 1, or 2")
        length = sqrt(sum(value * value for value in self.lattice[axis]))
        if length == 0:
            raise ValueError("lattice vector is zero")
        vectors = [list(row) for row in self.lattice]
        ratio = (length + float(size)) / length
        vectors[axis] = [value * ratio for value in vectors[axis]]
        return Structure(list(self.atoms), vectors)

    def wrap(self) -> "Structure":
        if self.lattice is None:
            return self.copy()
        inverse = _inverse(self.lattice)
        wrapped = []
        for atom in self.atoms:
            fractional = _mul(inverse, atom.position)
            fractional = tuple(value - floor(value) for value in fractional)
            wrapped.append(Atom(atom.element, _mul(self.lattice, fractional)))
        return Structure(wrapped, self.lattice)

    def to_xyz(self) -> str:
        lines = [str(len(self.atoms)), "AtomClay structure"]
        lines.extend(f"{a.element} {a.position[0]:.8f} {a.position[1]:.8f} {a.position[2]:.8f}" for a in self.atoms)
        return "\n".join(lines) + "\n"
