from __future__ import annotations

import random
import secrets
from typing import Any, Protocol, TypeVar

T = TypeVar("T")


class RNG(Protocol):
    def shuffle(self, seq: list[Any]) -> None: ...
    def randint(self, a: int, b: int) -> int: ...
    def random(self) -> float: ...
    def choice(self, seq: list[T]) -> T: ...


class SeededRNG:
    def __init__(self, seed: int) -> None:
        self._r = random.Random(seed)

    def shuffle(self, seq: list[Any]) -> None:
        self._r.shuffle(seq)

    def randint(self, a: int, b: int) -> int:
        return self._r.randint(a, b)

    def random(self) -> float:
        return self._r.random()

    def choice(self, seq: list[T]) -> T:
        return self._r.choice(seq)


class SecureRNG:
    def __init__(self) -> None:
        self._r = secrets.SystemRandom()

    def shuffle(self, seq: list[Any]) -> None:
        self._r.shuffle(seq)

    def randint(self, a: int, b: int) -> int:
        return self._r.randint(a, b)

    def random(self) -> float:
        return self._r.random()

    def choice(self, seq: list[T]) -> T:
        return self._r.choice(seq)


def make_rng(seed: int | None = None, secure: bool = False) -> RNG:
    if secure:
        return SecureRNG()
    if seed is not None:
        return SeededRNG(seed)
    return SeededRNG(random.randint(0, 2**32))
