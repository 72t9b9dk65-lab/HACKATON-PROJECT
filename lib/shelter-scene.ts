export function shelterSceneLayout(
  width: number,
  population: number,
  station: number,
) {
  const safeWidth = Math.max(200, width);
  const columns = Math.max(
    safeWidth < 252 ? 2 : 3,
    Math.floor(safeWidth / 104),
  );
  const rows = Math.ceil(population / columns);
  const height = Math.max(470, 280 + rows * 116);
  const cellWidth = (safeWidth - 24) / columns;
  return {
    height,
    positions: Array.from({ length: population }, (_, index) => {
      const x = 12 + ((index % columns) + 0.5) * cellWidth - 36;
      const y = 280 + Math.floor(index / columns) * 116;
      const targetX = Math.max(
        6,
        Math.min(
          safeWidth - 78,
          safeWidth * ((station + 0.5) / 3) - 36 + ((index % 3) - 1) * 12,
        ),
      );
      const targetY = 164 + (index % 2) * 8;
      return { x, y, dx: targetX - x, dy: targetY - y };
    }),
  };
}
