from app.core.rng.rng import RNG

RED = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
COLUMN_1 = {1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34}
COLUMN_2 = {2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35}
COLUMN_3 = {3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36}


class EuropeanWheel:
    @staticmethod
    def spin(rng: RNG) -> int:
        return rng.randint(0, 36)

    @staticmethod
    def is_red(n: int) -> bool:
        return n in RED

    @staticmethod
    def is_black(n: int) -> bool:
        return n != 0 and n not in RED
