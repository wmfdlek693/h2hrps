"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";
import { ExportPreview, type PreparedImage } from "./components/export-preview";

type Member = {
  name: string;
};

type Legend = {
  id: string;
  name: string;
  color: string;
  alpha: number;
};

type ChartData = {
  legends: Legend[];
  cells: Record<string, string | null>;
  showDate: boolean;
};

type AppState = {
  chart: ChartData;
  undo: ChartData[];
  redo: ChartData[];
};

type PaintTarget =
  | { type: "cell"; row: number; column: number }
  | { type: "row"; index: number }
  | { type: "column"; index: number };

type AppAction =
  | { type: "commit"; change: (chart: ChartData) => ChartData }
  | { type: "load"; chart: ChartData }
  | { type: "undo" }
  | { type: "redo" };

const MEMBERS: Member[] = [
  { name: "카르멘" },
  { name: "지우" },
  { name: "유하" },
  { name: "스텔라" },
  { name: "주은" },
  { name: "에이나" },
  { name: "이안" },
  { name: "예온" },
];

const ROW_GROUP_NAMES = ["몐왼", "닺왼", "람왼", "댠왼", "쭙왼", "냐왼", "얀왼", "녱왼"] as const;
const COLUMN_GROUP_NAMES = ["몐른", "닺른", "람른", "댠른", "쭙른", "냐른", "얀른", "녱른"] as const;

const DEFAULT_LEGENDS: Legend[] = [
  { id: "otp", name: "OTP", color: "#ff575f", alpha: 0.58 },
  { id: "love", name: "좋아함", color: "#f47bc2", alpha: 0.54 },
  { id: "interest", name: "호감", color: "#ffdb6d", alpha: 0.58 },
  { id: "possible", name: "가능", color: "#91c979", alpha: 0.56 },
  { id: "neutral", name: "무관심", color: "#ffffff", alpha: 0 },
  { id: "dislike", name: "별로", color: "#8bd8f5", alpha: 0.58 },
  { id: "mine", name: "지뢰", color: "#72767c", alpha: 0.82 },
];

const PAIR_NAMES = [
  ["", "몐닺", "몐람", "몐댠", "몐쭙", "몐냐", "몐얀", "몐녱"],
  ["닺몐", "", "닺람", "닺댠", "우앤주", "닺냐", "쥬얀", "닺녱"],
  ["람몐", "람닺", "", "람댠", "럄쭙", "럄냐", "람얀", "럄녱"],
  ["댠몐", "댠닺", "댠람", "", "댠쭙", "댠냐", "댠얀", "댠녱"],
  ["쭙몐", "쭙닺", "쭙람", "쭙댠", "", "쭙냐", "쭙얀", "쭙녱"],
  ["냐몐", "냐쥬", "냐람", "냐댠", "냐쭙", "", "냐얀", "냐녱"],
  ["얀몐", "얀닺", "얀람", "얀댠", "얀쭙", "얀냐", "", "얀녱"],
  ["녱몐", "녱닺", "녱람", "녱댠", "녱쭙", "녱냐", "녱얀", ""],
] as const;

const STORAGE_KEY = "hearts2hearts-rps-chart-v2";
const HISTORY_LIMIT = 100;
const LOGO_PATH = "/hearts2hearts-logo.png";
const CELL_FILL_ALPHA_REDUCTION = 0.06;

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Logo image could not be loaded"));
    image.src = src;
  });
}

function createEmptyCells() {
  const cells: Record<string, string | null> = {};
  MEMBERS.forEach((_, row) => {
    MEMBERS.forEach((__, column) => {
      if (row !== column) cells[`${row}-${column}`] = null;
    });
  });
  return cells;
}

function createInitialChart(): ChartData {
  return {
    legends: DEFAULT_LEGENDS.map((legend) => ({ ...legend })),
    cells: createEmptyCells(),
    showDate: false,
  };
}

function cloneChart(chart: ChartData): ChartData {
  return {
    legends: chart.legends.map((legend) => ({ ...legend })),
    cells: { ...chart.cells },
    showDate: chart.showDate,
  };
}

function chartsMatch(a: ChartData, b: ChartData) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function reducer(state: AppState, action: AppAction): AppState {
  if (action.type === "load") {
    return { chart: action.chart, undo: [], redo: [] };
  }

  if (action.type === "commit") {
    const next = action.change(cloneChart(state.chart));
    if (chartsMatch(state.chart, next)) return state;
    return {
      chart: next,
      undo: [...state.undo.slice(-(HISTORY_LIMIT - 1)), cloneChart(state.chart)],
      redo: [],
    };
  }

  if (action.type === "undo") {
    const previous = state.undo.at(-1);
    if (!previous) return state;
    return {
      chart: cloneChart(previous),
      undo: state.undo.slice(0, -1),
      redo: [cloneChart(state.chart), ...state.redo].slice(0, HISTORY_LIMIT),
    };
  }

  const next = state.redo[0];
  if (!next) return state;
  return {
    chart: cloneChart(next),
    undo: [...state.undo.slice(-(HISTORY_LIMIT - 1)), cloneChart(state.chart)],
    redo: state.redo.slice(1),
  };
}

function restoreSavedChart(value: unknown): ChartData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ChartData>;
  if (!candidate.cells || typeof candidate.cells !== "object") {
    return null;
  }

  const legends = DEFAULT_LEGENDS.map((legend) => ({ ...legend }));
  const validIds = new Set(legends.map((legend) => legend.id));
  const cells = createEmptyCells();
  Object.keys(cells).forEach((key) => {
    const savedValue = (candidate.cells as Record<string, unknown>)[key];
    cells[key] = typeof savedValue === "string" && validIds.has(savedValue) ? savedValue : null;
  });

  return {
    legends,
    cells,
    showDate: Boolean(candidate.showDate),
  };
}

function hexToRgba(hex: string, alpha: number) {
  const numeric = Number.parseInt(hex.slice(1), 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function cellFillColor(legend: Legend) {
  return hexToRgba(legend.color, Math.max(0, legend.alpha - CELL_FILL_ALPHA_REDUCTION));
}

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function versionDate() {
  return `${localDate().slice(2).replaceAll("-", "")} ver.`;
}

function Icon({ name }: { name: "undo" | "redo" | "trash" | "download" | "close" }) {
  if (name === "undo" || name === "redo") {
    const transform = name === "redo" ? "scale(-1 1) translate(-24 0)" : undefined;
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <g transform={transform}>
          <path d="M9 7 4 12l5 5" />
          <path d="M5 12h8.2a5.8 5.8 0 0 1 5.8 5.8" />
        </g>
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, {
    chart: createInitialChart(),
    undo: [],
    redo: [],
  });
  const [hydrated, setHydrated] = useState(false);
  const [paintTarget, setPaintTarget] = useState<PaintTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const [preparedImage, setPreparedImage] = useState<PreparedImage | null>(null);

  const legendMap = useMemo(
    () => new Map(state.chart.legends.map((legend) => [legend.id, legend])),
    [state.chart.legends],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = restoreSavedChart(JSON.parse(raw));
        if (saved) dispatch({ type: "load", chart: saved });
      }
    } catch {
      // A corrupt or unavailable local store should never block the chart.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => () => {
    if (preparedImage) URL.revokeObjectURL(preparedImage.url);
  }, [preparedImage]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chart));
    } catch {
      // The editor remains usable when browser storage is unavailable.
    }
  }, [hydrated, state.chart]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        setPaintTarget(null);
        return;
      }
      const command = event.metaKey || event.ctrlKey;
      if (!command) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: "undo" });
      } else if (
        (event.key.toLowerCase() === "z" && event.shiftKey) ||
        (event.ctrlKey && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function applyPaint(legendId: string | null) {
    const target = paintTarget;
    if (!target) return;
    dispatch({
      type: "commit",
      change: (chart) => {
        if (target.type === "cell") {
          chart.cells[`${target.row}-${target.column}`] = legendId;
        } else if (target.type === "row") {
          MEMBERS.forEach((_, column) => {
            if (column !== target.index) chart.cells[`${target.index}-${column}`] = legendId;
          });
        } else {
          MEMBERS.forEach((_, row) => {
            if (row !== target.index) chart.cells[`${row}-${target.index}`] = legendId;
          });
        }
        return chart;
      },
    });
    setPaintTarget(null);
  }

  function clearChart() {
    if (!Object.values(state.chart.cells).some(Boolean)) return;
    if (!window.confirm("초기화 할까요?")) return;
    dispatch({
      type: "commit",
      change: (chart) => ({ ...chart, cells: createEmptyCells() }),
    });
  }

  function targetTitle(target: PaintTarget) {
    if (target.type === "cell") {
      return PAIR_NAMES[target.row][target.column];
    }
    if (target.type === "column") return `${COLUMN_GROUP_NAMES[target.index]} 전체 칠하기`;
    return `${ROW_GROUP_NAMES[target.index]} 전체 칠하기`;
  }

  async function downloadChart(includeDate = state.chart.showDate) {
    if (exporting) return;
    setExporting(true);
    try {
      await document.fonts?.load('700 40px "GmarketSansBold"');
      await document.fonts?.ready;
      const logoImage = await loadCanvasImage(LOGO_PATH);
      const width = 1080;
      const scale = 2;
      const margin = 54;
      const cellWidth = (width - margin * 2) / 9;
      const cellHeight = 64;
      const tableY = 194;
      const tableBottom = tableY + cellHeight * 9;
      const legendY = tableBottom + 42;
      const height = Math.ceil(legendY + 72);
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.scale(scale, scale);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      const logoWidth = 540;
      const logoHeight = logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth);
      context.drawImage(logoImage, (width - logoWidth) / 2, 18, logoWidth, logoHeight);

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#8dd1fe";
      const titleText = "RPS 취향표";
      const titleFont = '700 40px "GmarketSansBold", Pretendard, Arial, sans-serif';
      const versionFont = '700 16px "GmarketSansBold", Pretendard, Arial, sans-serif';
      context.font = titleFont;
      const titleWidth = context.measureText(titleText).width;
      context.fillText(titleText, width / 2, 151);

      if (includeDate) {
        const dateText = versionDate();
        const titleGap = 8;
        context.textAlign = "left";
        context.font = versionFont;
        context.fillText(dateText, width / 2 + titleWidth / 2 + titleGap, 156);
      }

      const tableRadius = 16;
      context.save();
      context.beginPath();
      context.roundRect(margin, tableY, width - margin * 2, cellHeight * 9, tableRadius);
      context.clip();

      for (let visualRow = 0; visualRow < 9; visualRow += 1) {
        for (let visualColumn = 0; visualColumn < 9; visualColumn += 1) {
          const x = margin + visualColumn * cellWidth;
          const y = tableY + visualRow * cellHeight;
          const isCorner = visualRow === 0 && visualColumn === 0;
          const isHeader = !isCorner && (visualRow === 0 || visualColumn === 0);
          const row = visualRow - 1;
          const column = visualColumn - 1;
          const isDiagonal = row >= 0 && column >= 0 && row === column;
          let fill = "#ffffff";
          if (isHeader || isCorner) fill = "#8dd1fe";
          else if (isDiagonal) fill = "#ffffff";
          else {
            const legend = legendMap.get(state.chart.cells[`${row}-${column}`] ?? "");
            if (legend) fill = cellFillColor(legend);
          }
          context.fillStyle = fill;
          context.fillRect(x, y, cellWidth, cellHeight);
        }
      }

      context.strokeStyle = "#bfe4fa";
      context.lineWidth = 1;
      for (let index = 0; index <= 9; index += 1) {
        const x = margin + index * cellWidth;
        context.beginPath();
        context.moveTo(x, tableY);
        context.lineTo(x, tableY + cellHeight * 9);
        context.stroke();
        const y = tableY + index * cellHeight;
        context.beginPath();
        context.moveTo(margin, y);
        context.lineTo(width - margin, y);
        context.stroke();
      }

      context.textAlign = "center";
      context.textBaseline = "middle";
      for (let visualRow = 0; visualRow < 9; visualRow += 1) {
        for (let visualColumn = 0; visualColumn < 9; visualColumn += 1) {
          const x = margin + visualColumn * cellWidth + cellWidth / 2;
          const y = tableY + visualRow * cellHeight + cellHeight / 2;
          const row = visualRow - 1;
          const column = visualColumn - 1;
          if (visualRow === 0 && visualColumn === 0) {
            continue;
          } else if (visualRow === 0) {
            context.fillStyle = "#ffffff";
            context.font = '700 21px "GmarketSansBold", Pretendard, Arial, sans-serif';
            context.fillText(MEMBERS[column].name, x, y);
          } else if (visualColumn === 0) {
            context.fillStyle = "#ffffff";
            context.font = '700 21px "GmarketSansBold", Pretendard, Arial, sans-serif';
            context.fillText(MEMBERS[row].name, x, y);
          } else if (row === column) {
            continue;
          } else {
            const legend = legendMap.get(state.chart.cells[`${row}-${column}`] ?? "");
            context.fillStyle = legend?.id === "mine" ? "#ffffff" : "#000000";
            context.font = "700 20px Pretendard, Arial, sans-serif";
            context.fillText(PAIR_NAMES[row][column], x, y);
          }
        }
      }

      context.restore();
      context.beginPath();
      context.roundRect(margin, tableY, width - margin * 2, cellHeight * 9, tableRadius);
      context.strokeStyle = "#bfe4fa";
      context.lineWidth = 1;
      context.stroke();

      context.font = "650 17px Pretendard, Arial, sans-serif";
      const legendWidths = state.chart.legends.map((legend) => (
        18 + 8 + context.measureText(legend.name).width + 22
      ));
      const legendTotalWidth = legendWidths.reduce((sum, itemWidth) => sum + itemWidth, 0);
      let legendX = Math.max(margin, (width - legendTotalWidth) / 2);
      state.chart.legends.forEach((legend, index) => {
        context.beginPath();
        context.arc(legendX + 9, legendY, 9, 0, Math.PI * 2);
        context.fillStyle = hexToRgba(legend.color, legend.alpha);
        context.fill();
        context.strokeStyle = legend.id === "neutral" ? "#b8bcc1" : "rgba(65,69,74,.12)";
        context.lineWidth = 1;
        context.stroke();
        context.textAlign = "left";
        context.fillStyle = "#777b80";
        context.fillText(legend.name, legendX + 26, legendY);
        legendX += legendWidths[index];
      });

      const creditOwner = "@peppiiiii_";
      const creditSource = " · Original: cortis-rps-chart by 쵸비";
      context.textAlign = "left";
      context.fillStyle = "#aeb2b6";
      context.font = '700 14px "GmarketSansBold", Pretendard, Arial, sans-serif';
      const creditOwnerWidth = context.measureText(creditOwner).width;
      context.font = "400 11px Pretendard, Arial, sans-serif";
      const creditSourceWidth = context.measureText(creditSource).width;
      const creditStartX = (width - creditOwnerWidth - creditSourceWidth) / 2;
      context.font = '700 14px "GmarketSansBold", Pretendard, Arial, sans-serif';
      context.fillText(creditOwner, creditStartX, height - 24);
      context.font = "400 11px Pretendard, Arial, sans-serif";
      context.fillText(creditSource, creditStartX + creditOwnerWidth, height - 24);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("PNG creation failed"))), "image/png");
      });
      const url = URL.createObjectURL(blob);
      setPreparedImage({
        blob,
        url,
        filename: `hearts2hearts-rps-chart-${localDate()}.png`,
        width: canvas.width,
        height: canvas.height,
        alt: "저장할 Hearts2Hearts RPS 취향표",
      });
    } catch {
      window.alert("이미지를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="page-shell rps-page">
      <article className="chart-card">
        <header className="site-header">
          <Image
            className="brand-logo"
            src={LOGO_PATH}
            alt="Hearts2Hearts"
            width={2114}
            height={390}
            priority
          />
          <nav className="chart-tabs" aria-label="취향표 종류">
            <Link className="chart-tab active" href="/" aria-current="page">RPS 취향표</Link>
            <Link className="chart-tab" href="/left-right">왼른 취향표</Link>
          </nav>
          <h1>RPS 취향표</h1>
          <p className="subtitle">칸을 눌러 취향을 표시해 보세요</p>
        </header>

        <section className="table-section" aria-labelledby="chart-title">
          <div className="table-toolbar">
            <div>
              <h2 id="chart-title" className="sr-only">Hearts2Hearts RPS 취향표</h2>
              <p>멤버 이름을 누르면 그 줄 전체를 칠할 수 있어요</p>
              <span className="auto-save-state" aria-live="polite">
                <span aria-hidden="true" />
                {hydrated ? "이 기기에 자동 저장" : "불러오는 중"}
              </span>
            </div>
            <div className="history-controls" aria-label="편집 도구">
              <button
                className="icon-button"
                type="button"
                onClick={() => dispatch({ type: "undo" })}
                disabled={!state.undo.length}
                aria-label="실행 취소"
                title="실행 취소"
              >
                <Icon name="undo" />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => dispatch({ type: "redo" })}
                disabled={!state.redo.length}
                aria-label="다시 실행"
                title="다시 실행"
              >
                <Icon name="redo" />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={clearChart}
                disabled={!Object.values(state.chart.cells).some(Boolean)}
                aria-label="초기화"
                title="초기화"
              >
                <Icon name="trash" />
              </button>
            </div>
          </div>

          <div className="chart-shell">
            <table className="pairing-table">
              <thead>
                <tr>
                  <th className="corner-cell" scope="col" aria-label="방향 구분" />
                  {MEMBERS.map((member, column) => (
                    <th key={member.name} scope="col">
                      <button
                        className="member-button"
                        type="button"
                        onClick={() => setPaintTarget({ type: "column", index: column })}
                        aria-label={`${COLUMN_GROUP_NAMES[column]} 전체 칠하기`}
                      >
                        {member.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((rowMember, row) => (
                  <tr key={rowMember.name}>
                    <th scope="row">
                      <button
                        className="member-button"
                        type="button"
                        onClick={() => setPaintTarget({ type: "row", index: row })}
                        aria-label={`${ROW_GROUP_NAMES[row]} 전체 칠하기`}
                      >
                        {rowMember.name}
                      </button>
                    </th>
                    {MEMBERS.map((columnMember, column) => {
                      if (row === column) {
                        return (
                          <td className="diagonal-cell" key={columnMember.name} aria-label="같은 멤버" />
                        );
                      }
                      const key = `${row}-${column}`;
                      const legend = legendMap.get(state.chart.cells[key] ?? "");
                      const pairName = PAIR_NAMES[row][column];
                      return (
                        <td key={columnMember.name}>
                          <button
                            className="pair-cell"
                            type="button"
                            style={{ backgroundColor: legend ? cellFillColor(legend) : undefined }}
                            onClick={() => setPaintTarget({ type: "cell", row, column })}
                            aria-label={`${pairName}${legend ? `, ${legend.name}` : ", 미선택"}`}
                            title={`${pairName}${legend ? ` · ${legend.name}` : ""}`}
                          >
                            <span className={legend?.id === "mine" ? "light-text" : undefined}>{pairName}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="legend-section" aria-labelledby="legend-title">
          <h2 id="legend-title" className="sr-only">범례</h2>
          <div className="legend-list">
            {state.chart.legends.map((legend) => (
              <div className="legend-pill" key={legend.id}>
                <span
                  className={`legend-dot${legend.id === "neutral" ? " transparent-swatch" : ""}`}
                  style={{ backgroundColor: hexToRgba(legend.color, legend.alpha) }}
                  aria-hidden="true"
                />
                <span>{legend.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="export-section compact-export-section" aria-label="PNG 이미지 저장">
          <div className="export-actions">
            <label className="date-toggle">
              <input
                type="checkbox"
                checked={state.chart.showDate}
                onChange={(event) => {
                  const checked = event.target.checked;
                  dispatch({
                    type: "commit",
                    change: (chart) => ({ ...chart, showDate: checked }),
                  });
                }}
              />
              <span className="date-checkmark" aria-hidden="true" />
              이미지에 날짜 표시
            </label>
            <div className="export-button-group">
              <button className="download-button" type="button" onClick={() => downloadChart()} disabled={exporting}>
                <Icon name="download" />
                <span>{exporting ? "저장 중…" : "이미지 저장"}</span>
              </button>
              <button
                className="reset-button"
                type="button"
                onClick={clearChart}
                disabled={!Object.values(state.chart.cells).some(Boolean)}
              >
                <Icon name="trash" />
                <span>초기화</span>
              </button>
            </div>
          </div>
        </section>

        <footer>
          <span className="footer-owner">@peppiiiii_</span>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/en-chovy/cortis-rps-chart" target="_blank" rel="noreferrer">
            Original: cortis-rps-chart by 쵸비
          </a>
        </footer>
      </article>

      {paintTarget && (
        <div className="modal-backdrop" role="presentation" onPointerDown={() => setPaintTarget(null)}>
          <section
            className="paint-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="paint-picker-title"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="modal-title-row">
              <div>
                <p>색칠하기</p>
                <h2 id="paint-picker-title">{targetTitle(paintTarget)}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setPaintTarget(null)} aria-label="닫기">
                <Icon name="close" />
              </button>
            </div>
            <div className="paint-options">
              {state.chart.legends.map((legend) => (
                <button type="button" key={legend.id} onClick={() => applyPaint(legend.id)}>
                  <span
                    className={legend.id === "neutral" ? "transparent-swatch" : undefined}
                    style={{ backgroundColor: hexToRgba(legend.color, legend.alpha) }}
                  />
                  {legend.name}
                </button>
              ))}
            </div>
            <button className="clear-option" type="button" onClick={() => applyPaint(null)}>
              선택 지우기
            </button>
          </section>
        </div>
      )}

      {preparedImage && (
        <ExportPreview image={preparedImage} onClose={() => setPreparedImage(null)} />
      )}

    </main>
  );
}
