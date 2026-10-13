/** Engraved strokes remain visible even on devices without a Runic Unicode font. */
export function drawRuneMark(
  ctx: CanvasRenderingContext2D,
  letter: string,
  size: number,
  color: string,
  pulse = 0,
) {
  const shapes = [
    [
      [0, 0.5],
      [0, -0.5],
      [0.4, -0.8],
      [0, -0.5],
      [0.4, -0.2],
    ],
    [
      [-0.35, 0.5],
      [-0.35, -0.5],
      [0.3, -0.2],
      [0.3, 0.5],
    ],
    [
      [0, 0.5],
      [0, -0.5],
      [0.4, -0.2],
      [0, -0.3],
      [0.4, 0.1],
    ],
    [
      [-0.3, 0.5],
      [-0.3, -0.5],
      [0.35, -0.2],
      [-0.3, 0.05],
      [0.35, 0.5],
    ],
    [
      [0, -0.5],
      [0.45, 0],
      [0, 0.5],
      [-0.45, 0],
      [0, -0.5],
    ],
    [
      [-0.4, -0.5],
      [0.4, 0.5],
      [0, 0],
      [-0.4, 0.5],
      [0.4, -0.5],
    ],
    [
      [0, 0.5],
      [0, -0.5],
      [-0.35, -0.15],
      [0, -0.5],
      [0.35, -0.15],
    ],
    [
      [-0.3, -0.5],
      [-0.3, 0.5],
      [0.3, -0.5],
      [0.3, 0.5],
    ],
  ];
  const points = shapes[(letter.codePointAt(0) ?? 0) % shapes.length]!;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach(([x, y], i) =>
    i ? ctx.lineTo(x! * size, y! * size) : ctx.moveTo(x! * size, y! * size),
  );
  ctx.strokeStyle = "rgba(4,12,14,.8)";
  ctx.lineWidth = Math.max(1.8, size * 0.18);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 2 + pulse * 12;
  ctx.lineWidth = Math.max(0.8, size * 0.07);
  ctx.stroke();
  ctx.restore();
}
