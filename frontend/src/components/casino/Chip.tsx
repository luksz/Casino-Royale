import { cn } from "@/lib/utils";

const CHIP_STYLES: Record<number, string> = {
  1:    "bg-gray-200 text-gray-800 border-gray-400",
  5:    "bg-red-600 text-white border-red-800",
  25:   "bg-green-600 text-white border-green-800",
  100:  "bg-blue-600 text-white border-blue-800",
  500:  "bg-purple-600 text-white border-purple-800",
  1000: "bg-yellow-500 text-gray-900 border-yellow-600",
  5000: "bg-orange-500 text-white border-orange-700",
};

interface ChipProps {
  value: number;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Chip({ value, onClick, disabled, size = "md" }: ChipProps) {
  const style = CHIP_STYLES[value] ?? "bg-gray-500 text-white border-gray-700";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border-4 font-bold flex items-center justify-center",
        "transition-transform active:scale-95 shadow-md",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        size === "md" ? "w-12 h-12 text-xs" : "w-8 h-8 text-xs",
        style,
      )}
    >
      {value >= 1000 ? `${value / 1000}K` : value}
    </button>
  );
}
