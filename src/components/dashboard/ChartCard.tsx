// src/components/dashboard/ChartCard.tsx
"use client";

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 ${className}`}
    >
      <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
        {title}
      </p>
      {subtitle && <p className="text-md text-zinc-400 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function isDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function setupCanvas(canvas: HTMLCanvasElement, W: number, H: number) {
  const dpr = Math.max(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d", { alpha: true })!;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

export function drawAreaLine(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  color: string,
) {
  const W = canvas.getBoundingClientRect().width || canvas.offsetWidth;
  const H = 160;
  const ctx = setupCanvas(canvas, W, H);

  const dark = isDark();
  const gridColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const textColor = dark ? "#666" : "#aaa";
  const padL = 42,
    padR = 12,
    padT = 12,
    padB = 28;
  const W2 = W - padL - padR;
  const H2 = H - padT - padB;
  const max = Math.max(...values, 1);

  ctx.clearRect(0, 0, W, H);

  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const y = padT + H2 * (1 - t);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    const label =
      max >= 1000
        ? "$" + Math.round((max * t) / 1000) + "K"
        : "$" + Math.round(max * t);
    ctx.fillText(label, padL - 4, y + 3);
  });

  if (values.length < 2) return;
  const xStep = W2 / (values.length - 1);

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = padT + H2 * (1 - v / max);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + (values.length - 1) * xStep, padT + H2);
  ctx.lineTo(padL, padT + H2);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + H2);
  grad.addColorStop(0, color + "50");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  values.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = padT + H2 * (1 - v / max);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  values.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = padT + H2 * (1 - v / max);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  });

  ctx.fillStyle = textColor;
  ctx.font = "10px system-ui";
  ctx.textAlign = "center";
  labels.forEach((label, i) => {
    if (i % 2 !== 0) return;
    ctx.fillText(label, padL + i * xStep, H - 6);
  });
}

export function drawHBar(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  color: string,
  formatValue?: (v: number) => string,
) {
  const W = canvas.getBoundingClientRect().width || canvas.offsetWidth;
  const rowH = 42;
  const H = labels.length * rowH + 16;
  const ctx = setupCanvas(canvas, W, H);

  const dark = isDark();
  const textColor = dark ? "#ccc" : "#555";
  const max = Math.max(...values, 1);

  ctx.clearRect(0, 0, W, H);
  ctx.font = "14px system-ui";

  const maxLabelW = Math.min(Math.floor(W * 0.45), 200);
  const labelW = Math.min(
    Math.max(...labels.map((l) => ctx.measureText(l).width)) + 12,
    maxLabelW,
  );
  const barW = W - labelW - 50;

  function truncate(text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + "…").width > maxW)
      t = t.slice(0, -1);
    return t + "…";
  }

  labels.forEach((label, i) => {
    const y = i * rowH + 8;
    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.fillText(truncate(label, labelW - 8), labelW - 6, y + 20);

    const bw = (values[i] / max) * barW;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(labelW, y + 6, Math.max(bw, 2), 22, 5);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    const valStr = formatValue ? formatValue(values[i]) : String(values[i]);
    ctx.fillText(valStr, labelW + bw + 8, y + 20);
  });
}

export function drawDonut(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  colors: string[],
) {
  const W = canvas.getBoundingClientRect().width || canvas.offsetWidth;
  const size = Math.min(W, 180);
  const ctx = setupCanvas(canvas, size, size);

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return;

  const cx = size / 2,
    cy = size / 2,
    r = size * 0.4,
    inner = size * 0.24;
  let angle = -Math.PI / 2;

  values.forEach((v, i) => {
    const slice = (v / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    angle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  ctx.fillStyle = isDark() ? "#18181b" : "#ffffff";
  ctx.fill();

  ctx.fillStyle = isDark() ? "#eee" : "#222";
  ctx.font = `600 ${Math.round(size * 0.13)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(total), cx, cy);
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 animate-pulse">
      <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
      <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
      <div className="h-2 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 animate-pulse">
      <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
      <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded" />
    </div>
  );
}
