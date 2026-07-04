export const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
export const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export const SECTOR_DEG = 360 / WHEEL_ORDER.length;

export function calcWheelRotation(prev: number, winningNumber: number): number {
  const idx = WHEEL_ORDER.indexOf(winningNumber);
  const sectorCenter = (idx * SECTOR_DEG + SECTOR_DEG / 2) % 360;
  const offset = sectorCenter === 0 ? 0 : 360 - sectorCenter;
  const base = Math.ceil(prev / 360) * 360;
  return base + 5 * 360 + offset;
}
