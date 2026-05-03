const DENOMS = [5000, 1000, 500, 100, 25, 5, 1] as const;

const CHIP_STYLE: Record<number, { bg: string; border: string; text: string }> = {
  1:    { bg: "#d1d5db", border: "#6b7280", text: "#1f2937" },
  5:    { bg: "#dc2626", border: "#7f1d1d", text: "#ffffff" },
  25:   { bg: "#16a34a", border: "#14532d", text: "#ffffff" },
  100:  { bg: "#2563eb", border: "#1e3a8a", text: "#ffffff" },
  500:  { bg: "#7c3aed", border: "#3b0764", text: "#ffffff" },
  1000: { bg: "#ca8a04", border: "#713f12", text: "#ffffff" },
  5000: { bg: "#ea580c", border: "#7c2d12", text: "#ffffff" },
};

function decomposeChips(amount: number): Array<{ denom: number; count: number }> {
  const result: Array<{ denom: number; count: number }> = [];
  let rem = amount;
  for (const d of DENOMS) {
    if (rem >= d) {
      const count = Math.floor(rem / d);
      result.push({ denom: d, count });
      rem -= count * d;
    }
  }
  return result;
}

interface ChipStackProps {
  amount: number;
  size?: number;
}

export function ChipStack({ amount, size = 32 }: ChipStackProps) {
  if (amount <= 0) return null;
  const chips = decomposeChips(amount).slice(0, 6);
  const fontSize = Math.round(size * 0.27);

  return (
    <div className="flex items-center" style={{ height: size }}>
      {chips.map(({ denom, count }, i) => {
        const s = CHIP_STYLE[denom] ?? CHIP_STYLE[1];
        const label = denom >= 1000 ? `${denom / 1000}K` : String(denom);
        return (
          <div
            key={denom}
            className="relative flex-shrink-0"
            style={{ marginLeft: i === 0 ? 0 : -(size * 0.28), zIndex: chips.length - i }}
          >
            <div
              className="rounded-full flex items-center justify-center font-black shadow-md border-[3px]"
              style={{
                width: size,
                height: size,
                fontSize,
                backgroundColor: s.bg,
                borderColor: s.border,
                color: s.text,
              }}
            >
              {label}
            </div>
            {count > 1 && (
              <span
                className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-black leading-none"
                style={{
                  width: size * 0.44,
                  height: size * 0.44,
                  fontSize: size * 0.22,
                  background: "#f4c542",
                  color: "#0f172a",
                  border: "1px solid #a16207",
                }}
              >
                {count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
