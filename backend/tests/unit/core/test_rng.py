from app.core.rng.rng import SeededRNG, make_rng


def test_determinism_with_same_seed():
    r1 = SeededRNG(42)
    r2 = SeededRNG(42)
    assert r1.random() == r2.random()
    assert r1.randint(0, 100) == r2.randint(0, 100)


def test_different_seeds_differ():
    r1 = SeededRNG(1)
    r2 = SeededRNG(2)
    results1 = [r1.random() for _ in range(10)]
    results2 = [r2.random() for _ in range(10)]
    assert results1 != results2


def test_make_rng_seeded():
    rng = make_rng(seed=7)
    rng2 = make_rng(seed=7)
    assert rng.random() == rng2.random()


def test_make_rng_no_seed_returns_rng():
    rng = make_rng()
    assert hasattr(rng, "shuffle")
    assert hasattr(rng, "randint")
    assert hasattr(rng, "random")
    assert hasattr(rng, "choice")
