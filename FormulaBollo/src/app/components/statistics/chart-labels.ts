export const LINE_DASHES = [[], [6, 3], [2, 3], [9, 3, 2, 3], [12, 4], [6, 3, 2, 3, 2, 3]];
export const LINE_PLOT_HEIGHT = 274;

export function endLabelPlacement(natural: number[]): { align: number; offset: number }[] {
  const order = natural.map((_, index) => index).sort((a, b) => natural[a] - natural[b]);
  const placed: number[] = [];
  order.forEach((index, position) => {
    placed[index] = position ? Math.max(natural[index], placed[order[position - 1]] + 13) : natural[index];
  });
  return natural.map((value, index) => {
    const shift = placed[index] - value;
    return { align: Math.atan2(shift, 18) * 180 / Math.PI, offset: Math.hypot(shift, 18) };
  });
}
