from decimal import Decimal, ROUND_HALF_UP

def to_cents(amount: float) -> int:
    # robust float->cents conversion
    d = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(d * 100)

def from_cents(cents: int) -> float:
    return float(Decimal(cents) / 100)
