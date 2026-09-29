"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExportPreview, type PreparedImage } from "../components/export-preview";

type Member = {
  id: string;
  name: string;
  image: string;
};

type MemberEntry = {
  segments: boolean[];
  note: string;
};

type LeftRightData = Record<string, MemberEntry>;

const MEMBERS: Member[] = [
  { id: "carmen", name: "卡门", image: "/members/carmen.jpeg" },
  { id: "jiwoo", name: "崔志宇", image: "/members/jiwoo.jpeg" },
  { id: "yuha", name: "柳河岚", image: "/members/yuha.jpeg" },
  { id: "stella", name: "金多绚", image: "/members/stella.jpeg" },
  { id: "jueun", name: "金主恩", image: "/members/jueun.jpeg" },
  { id: "aina", name: "卢惟那", image: "/members/aina.jpeg" },
  { id: "ian", name: "郑伊安", image: "/members/ian.jpeg" },
  { id: "yeon", name: "金奈延", image: "/members/yeon.jpeg" },
];

const STORAGE_KEY = "hearts2hearts-left-right-chart-cn-v1";
const DATE_STORAGE_KEY = "hearts2hearts-left-right-show-date-cn-v1";
const LOGO_PATH = "/hearts2hearts-logo.png";
const NOTE_LIMIT = 80;
const SEGMENT_COUNT = 10;

function createInitialData(): LeftRightData {
  return Object.fromEntries(
    MEMBERS.map((member) => [
      member.id,
      {
        segments: Array(SEGMENT_COUNT).fill(false),
        note: "",
      },
    ]),
  );
}

function restoreSavedData(value: unknown): LeftRightData | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const restored = createInitialData();

  MEMBERS.forEach((member) => {
    const saved = candidate[member.id];

    if (!saved || typeof saved !== "object") return;

    const entry = saved as Partial<MemberEntry> & {
      left?: unknown;
      right?: unknown;
      touched?: unknown;
      value?: unknown;
    };

    let segments = Array(SEGMENT_COUNT).fill(false) as boolean[];

    const savedLeft = Number(entry.left);
    const savedRight = Number(entry.right);
    const legacyValue = Number(entry.value);

    if (Array.isArray(entry.segments)) {
      segments = Array.from(
        { length: SEGMENT_COUNT },
        (_, index) => Boolean(entry.segments?.[index]),
      );
    } else if (
      Boolean(entry.touched) &&
      Number.isFinite(savedLeft) &&
      Number.isFinite(savedRight)
    ) {
      const left = Math.min(
        100,
        Math.max(0, Math.min(savedLeft, savedRight)),
      );

      const right = Math.min(
        100,
        Math.max(0, Math.max(savedLeft, savedRight)),
      );

      if (left === right) {
        segments[
          Math.min(
            SEGMENT_COUNT - 1,
            Math.floor(left / (100 / SEGMENT_COUNT)),
          )
        ] = true;
      } else {
        segments = segments.map((_, index) => {
          const segmentLeft =
            index * (100 / SEGMENT_COUNT);

          const segmentRight =
            (index + 1) * (100 / SEGMENT_COUNT);

          return (
            segmentLeft < right &&
            segmentRight > left
          );
        });
      }
    } else if (
      Boolean(entry.touched) &&
      Number.isFinite(legacyValue)
    ) {
      const end = Math.min(
        100,
        Math.max(0, legacyValue),
      );

      segments = segments.map(
        (_, index) =>
          index * (100 / SEGMENT_COUNT) < end,
      );
    }

    restored[member.id] = {
      segments,
      note:
        typeof entry.note === "string"
          ? entry.note.slice(0, NOTE_LIMIT)
          : "",
    };
  });

  return restored;
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>(
    (resolve, reject) => {
      const image =
        document.createElement("img");

      image.onload = () => resolve(image);

      image.onerror = () =>
        reject(
          new Error(`Could not load ${src}`),
        );

      image.src = src;
    },
  );
}

function localDate() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function versionDate() {
  return `${localDate()
    .slice(2)
    .replaceAll("-", "")} ver.`;
}

function drawCoverCircle(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const sourceSize = Math.min(
    image.naturalWidth,
    image.naturalHeight,
  );

  const sourceX =
    (image.naturalWidth - sourceSize) / 2;

  const sourceY =
    (image.naturalHeight - sourceSize) / 2;

  context.save();

  context.beginPath();

  context.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2,
  );

  context.clip();

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    x,
    y,
    size,
    size,
  );

  context.restore();

  context.beginPath();

  context.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2,
  );

  context.strokeStyle = "#bfe4fa";
  context.lineWidth = 3;
  context.stroke();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();

  context.roundRect(
    x,
    y,
    width,
    height,
    radius,
  );
}

function wrapTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  if (!text.trim()) return [];

  const lines: string[] = [];
  let current = "";
  let overflowed = false;

  for (const character of text) {
    if (character === "\n") {
      lines.push(current);
      current = "";
    } else {
      const next = current + character;

      if (
        current &&
        context.measureText(next).width >
          maxWidth
      ) {
        lines.push(current);
        current = character;
      } else {
        current = next;
      }
    }

    if (lines.length >= maxLines) {
      overflowed = true;
      break;
    }
  }

  if (
    lines.length < maxLines &&
    current
  ) {
    lines.push(current);
  }

  if (
    overflowed &&
    lines.length
  ) {
    let last =
      lines[maxLines - 1] ?? "";

    while (
      last &&
      context.measureText(
        `${last}…`,
      ).width > maxWidth
    ) {
      last = last.slice(0, -1);
    }

    lines[maxLines - 1] =
      `${last}…`;
  }

  return lines.slice(0, maxLines);
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" />
    </svg>
  );
}

export default function ChineseLeftRightChart() {
  const [data, setData] =
    useState<LeftRightData>(
      () => createInitialData(),
    );

  const [showDate, setShowDate] =
    useState(false);

  const [hydrated, setHydrated] =
    useState(false);

  const [exporting, setExporting] =
    useState(false);

  const [
    preparedImage,
    setPreparedImage,
  ] =
    useState<PreparedImage | null>(
      null,
    );

  useEffect(() => {
    let restored:
      | LeftRightData
      | null = null;

    let restoredShowDate = false;

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        );

      if (raw) {
        restored =
          restoreSavedData(
            JSON.parse(raw),
          );
      }

      restoredShowDate =
        window.localStorage.getItem(
          DATE_STORAGE_KEY,
        ) === "true";
    } catch {
      // 저장 데이터 오류가 있어도 페이지는 정상 동작
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          if (restored) {
            setData(restored);
          }

          setShowDate(
            restoredShowDate,
          );

          setHydrated(true);
        },
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, []);

  useEffect(
    () => () => {
      if (preparedImage) {
        URL.revokeObjectURL(
          preparedImage.url,
        );
      }
    },
    [preparedImage],
  );

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data),
      );

      window.localStorage.setItem(
        DATE_STORAGE_KEY,
        String(showDate),
      );
    } catch {
      // 저장소를 사용할 수 없어도 편집 기능은 유지
    }
  }, [
    data,
    hydrated,
    showDate,
  ]);

  function updateEntry(
    id: string,
    change: Partial<MemberEntry>,
  ) {
    setData((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...change,
      },
    }));
  }

  function toggleSegment(
    id: string,
    segmentIndex: number,
  ) {
    setData((current) => {
      const entry = current[id];

      const segments = [
        ...entry.segments,
      ];

      segments[segmentIndex] =
        !segments[segmentIndex];

      return {
        ...current,
        [id]: {
          ...entry,
          segments,
        },
      };
    });
  }

  function clearAll() {
    const hasContent =
      Object.values(data).some(
        (entry) =>
          entry.segments.some(
            Boolean,
          ) ||
          entry.note.trim(),
      );

    if (!hasContent) return;

    if (
      !window.confirm(
        "确定要全部清空吗？",
      )
    ) {
      return;
    }

    setData(createInitialData());
  }

  async function downloadChart(
    includeDate = showDate,
  ) {
    if (exporting) return;

    setExporting(true);

    try {
      await document.fonts?.load(
        '700 30px "GmarketSansBold"',
      );

      await document.fonts?.ready;

      const [
        logo,
        ...memberImages
      ] = await Promise.all([
        loadCanvasImage(
          LOGO_PATH,
        ),

        ...MEMBERS.map(
          (member) =>
            loadCanvasImage(
              member.image,
            ),
        ),
      ]);

      const width = 1800;
      const height = 1270;
      const scale = 2;

      const margin = 60;
      const columnGap = 40;

      const columnWidth =
        (width -
          margin * 2 -
          columnGap) /
        2;

      const gridY = 230;
      const rowHeight = 240;
      const photoSize = 184;

      const canvas =
        document.createElement(
          "canvas",
        );

      canvas.width =
        width * scale;

      canvas.height =
        height * scale;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas is unavailable",
        );
      }

      context.scale(
        scale,
        scale,
      );

      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        width,
        height,
      );

      const logoWidth = 620;

      const logoHeight =
        logoWidth *
        (logo.naturalHeight /
          logo.naturalWidth);

      context.drawImage(
        logo,
        (width - logoWidth) / 2,
        24,
        logoWidth,
        logoHeight,
      );

      context.textAlign =
        "center";

      context.textBaseline =
        "middle";

      context.fillStyle =
        "#8dd1fe";

      const titleText =
        "公嬷取向表";

      const titleFont =
        '700 42px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "GmarketSansBold", sans-serif';

      const versionFont =
        '700 16px "GmarketSansBold", Pretendard, Arial, sans-serif';

      context.font =
        titleFont;

      const titleWidth =
        context.measureText(
          titleText,
        ).width;

      context.fillText(
        titleText,
        width / 2,
        180,
      );

      if (includeDate) {
        const dateText =
          versionDate();

        const titleGap = 9;

        context.textAlign =
          "left";

        context.font =
          versionFont;

        context.fillText(
          dateText,
          width / 2 +
            titleWidth / 2 +
            titleGap,
          185,
        );
      }

      MEMBERS.forEach(
        (member, index) => {
          const column =
            index < 4 ? 0 : 1;

          const row =
            index % 4;

          const cardX =
            margin +
            column *
              (columnWidth +
                columnGap);

          const cardY =
            gridY +
            row * rowHeight;

          const controlsX =
            cardX +
            photoSize +
            24;

          const controlsWidth =
            columnWidth -
            photoSize -
            24;

          const gaugeY =
            cardY + 18;

          const gaugeX =
            controlsX + 30;

          const gaugeWidth =
            controlsWidth - 60;

          const gaugeHeight = 32;

          const noteY =
            cardY + 62;

          const noteHeight = 170;

          const photoY =
            noteY +
            (noteHeight -
              photoSize) /
              2;

          const entry =
            data[member.id];

          drawCoverCircle(
            context,
            memberImages[index],
            cardX,
            photoY,
            photoSize,
          );

          context.textAlign =
            "center";

          context.textBaseline =
            "middle";

          context.fillStyle =
            "#8dd1fe";

          context.font =
            '700 24px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

          context.fillText(
            "公",
            controlsX + 10,
            gaugeY +
              gaugeHeight / 2,
          );

          context.fillText(
            "嬷",
            controlsX +
              controlsWidth -
              10,
            gaugeY +
              gaugeHeight / 2,
          );

          roundedRect(
            context,
            gaugeX,
            gaugeY,
            gaugeWidth,
            gaugeHeight,
            10,
          );

          context.fillStyle =
            "#ffffff";

          context.fill();

          context.strokeStyle =
            "#8dd1fe";

          context.lineWidth = 3;

          context.stroke();

          const innerX =
            gaugeX + 3;

          const innerY =
            gaugeY + 3;

          const innerWidth =
            gaugeWidth - 6;

          const innerHeight =
            gaugeHeight - 6;

          const segmentWidth =
            innerWidth /
            SEGMENT_COUNT;

          context.save();

          roundedRect(
            context,
            innerX,
            innerY,
            innerWidth,
            innerHeight,
            7,
          );

          context.clip();

          entry.segments.forEach(
            (
              isSelected,
              segmentIndex,
            ) => {
              if (!isSelected) {
                return;
              }

              context.fillStyle =
                "rgba(141, 209, 254, 0.62)";

              context.fillRect(
                innerX +
                  segmentIndex *
                    segmentWidth,
                innerY,
                segmentWidth,
                innerHeight,
              );
            },
          );

          context.restore();

          context.strokeStyle =
            "rgba(141, 209, 254, 0.38)";

          context.lineWidth = 1;

          for (
            let divider = 1;
            divider <
            SEGMENT_COUNT;
            divider += 1
          ) {
            const dividerX =
              innerX +
              divider *
                segmentWidth;

            context.beginPath();

            context.moveTo(
              dividerX,
              innerY,
            );

            context.lineTo(
              dividerX,
              innerY +
                innerHeight,
            );

            context.stroke();
          }

          roundedRect(
            context,
            controlsX,
            noteY,
            controlsWidth,
            noteHeight,
            11,
          );

          context.fillStyle =
            "#ffffff";

          context.fill();

          context.strokeStyle =
            "#8dd1fe";

          context.lineWidth = 3;

          context.stroke();

          if (
            entry.note.trim()
          ) {
            context.save();

            context.textAlign =
              "center";

            context.textBaseline =
              "top";

            context.fillStyle =
              "#000000";

            context.font =
              '400 27px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", Pretendard, Arial, sans-serif';

            context.letterSpacing =
              "-1px";

            const lineHeight = 31;

            const lines =
              wrapTextLines(
                context,
                entry.note.trim(),
                controlsWidth - 34,
                5,
              );

            const textY =
              noteY +
              (noteHeight -
                lines.length *
                  lineHeight) /
                2;

            lines.forEach(
              (
                line,
                lineIndex,
              ) => {
                context.fillText(
                  line,
                  controlsX +
                    controlsWidth /
                      2,
                  textY +
                    lineIndex *
                      lineHeight,
                );
              },
            );

            context.restore();
          }
        },
      );

      const creditOwner =
        "@peppiiiii_";

      const creditSource =
        " · Original: cortis-rps-chart by 쵸비";

      context.textAlign =
        "left";

      context.textBaseline =
        "middle";

      context.fillStyle =
        "#aeb2b6";

      context.font =
        '700 16px "GmarketSansBold", Pretendard, Arial, sans-serif';

      const creditOwnerWidth =
        context.measureText(
          creditOwner,
        ).width;

      context.font =
        "400 12px Pretendard, Arial, sans-serif";

      const creditSourceWidth =
        context.measureText(
          creditSource,
        ).width;

      const creditStartX =
        (width -
          creditOwnerWidth -
          creditSourceWidth) /
        2;

      context.font =
        '700 16px "GmarketSansBold", Pretendard, Arial, sans-serif';

      context.fillText(
        creditOwner,
        creditStartX,
        height - 30,
      );

      context.font =
        "400 12px Pretendard, Arial, sans-serif";

      context.fillText(
        creditSource,
        creditStartX +
          creditOwnerWidth,
        height - 30,
      );

      const blob =
        await new Promise<Blob>(
          (
            resolve,
            reject,
          ) => {
            canvas.toBlob(
              (result) =>
                result
                  ? resolve(
                      result,
                    )
                  : reject(
                      new Error(
                        "PNG creation failed",
                      ),
                    ),
              "image/png",
            );
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      setPreparedImage({
        blob,
        url,
        filename: `hearts2hearts-left-right-cn-${localDate()}.png`,
        width: canvas.width,
        height: canvas.height,
        alt: "Hearts2Hearts 公嬷取向表",
      });
    } catch {
      window.alert(
        "生成图片时出现问题，请稍后再试。",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="page-shell left-right-page">
      <article className="chart-card lr-chart-card">
        <header className="site-header">
          <Image
            className="brand-logo"
            src={LOGO_PATH}
            alt="Hearts2Hearts"
            width={2114}
            height={390}
            priority
          />

          <nav
            className="chart-tabs"
            aria-label="取向表类型"
          >
            <Link
              className="chart-tab"
              href="/middle"
            >
              RPS取向表
            </Link>

            <Link
              className="chart-tab active"
              href="/left-right-cn"
              aria-current="page"
            >
              公嬷取向表
            </Link>
          </nav>

          <h1>公嬷取向表</h1>

          <p className="subtitle">
            点击格子进行选择，并在文本框里写下你的想法
          </p>
        </header>

        <section
          className="lr-editor"
          aria-labelledby="left-right-title"
        >
          <div className="lr-toolbar">
            <div>
              <h2
                id="left-right-title"
                className="sr-only"
              >
                成员公嬷取向输入
              </h2>

              <p>
                公–嬷之间可以选择多个格子
              </p>

              <span
                className="auto-save-state"
                aria-live="polite"
              >
                <span
                  aria-hidden="true"
                />

                {hydrated
                  ? "已自动保存在此设备"
                  : "正在加载"}
              </span>
            </div>

            <button
              className="lr-clear-button"
              type="button"
              onClick={clearAll}
            >
              全部清空
            </button>
          </div>

          <div className="lr-grid">
            {[
              MEMBERS.slice(0, 4),
              MEMBERS.slice(4),
            ].map(
              (
                column,
                columnIndex,
              ) => (
                <div
                  className="lr-column"
                  key={
                    columnIndex === 0
                      ? "left"
                      : "right"
                  }
                >
                  {column.map(
                    (member) => {
                      const entry =
                        data[
                          member.id
                        ];

                      return (
                        <article
                          className="lr-member-card"
                          key={
                            member.id
                          }
                        >
                          <div className="lr-photo-column">
                            <div className="lr-member-photo">
                              <Image
                                src={
                                  member.image
                                }
                                alt={
                                  member.name
                                }
                                width={
                                  1000
                                }
                                height={
                                  1000
                                }
                                sizes="(max-width: 640px) 84px, 132px"
                                loading="eager"
                                unoptimized
                              />
                            </div>
                          </div>

                          <div className="lr-member-controls">
                            <div className="lr-gauge-row">
                              <span aria-hidden="true">
                                公
                              </span>

                              <div
                                className="lr-segmented-range"
                                role="group"
                                aria-label={`${member.name} 公嬷选择`}
                              >
                                {entry.segments.map(
                                  (
                                    isSelected,
                                    segmentIndex,
                                  ) => (
                                    <button
                                      className={`lr-segment-button${
                                        isSelected
                                          ? " selected"
                                          : ""
                                      }`}
                                      type="button"
                                      key={
                                        segmentIndex
                                      }
                                      onClick={() =>
                                        toggleSegment(
                                          member.id,
                                          segmentIndex,
                                        )
                                      }
                                      aria-pressed={
                                        isSelected
                                      }
                                      aria-label={`${member.name} 第${segmentIndex + 1}格`}
                                      title={`第${segmentIndex + 1}格`}
                                    />
                                  ),
                                )}
                              </div>

                              <span aria-hidden="true">
                                嬷
                              </span>
                            </div>

                            <div className="lr-note-box">
                              <textarea
                                value={
                                  entry.note
                                }
                                maxLength={
                                  NOTE_LIMIT
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateEntry(
                                    member.id,
                                    {
                                      note:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                                placeholder="写下你的想法吧"
                                aria-label={`${member.name} 取向备注`}
                              />

                              <span>
                                {
                                  entry
                                    .note
                                    .length
                                }
                                /
                                {
                                  NOTE_LIMIT
                                }
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              ),
            )}
          </div>
        </section>

        <section
          className="export-section compact-export-section lr-export-section"
          aria-label="保存PNG图片"
        >
          <div className="export-actions">
            <label className="date-toggle">
              <input
                type="checkbox"
                checked={
                  showDate
                }
                onChange={(
                  event,
                ) =>
                  setShowDate(
                    event.target
                      .checked,
                  )
                }
              />

              <span
                className="date-checkmark"
                aria-hidden="true"
              />

              图片中显示日期
            </label>

            <div className="export-button-group">
              <button
                className="download-button"
                type="button"
                onClick={() =>
                  downloadChart()
                }
                disabled={
                  exporting
                }
              >
                <DownloadIcon />

                <span>
                  {exporting
                    ? "保存中…"
                    : "保存图片"}
                </span>
              </button>

              <button
                className="reset-button"
                type="button"
                onClick={clearAll}
                disabled={
                  !Object.values(
                    data,
                  ).some(
                    (entry) =>
                      entry.segments.some(
                        Boolean,
                      ) ||
                      entry.note.trim(),
                  )
                }
              >
                <TrashIcon />

                <span>
                  重置
                </span>
              </button>
            </div>
          </div>
        </section>

        <footer>
          <span className="footer-owner">
            @peppiiiii_
          </span>

          <span aria-hidden="true">
            ·
          </span>

          <a
            href="https://github.com/en-chovy/cortis-rps-chart"
            target="_blank"
            rel="noreferrer"
          >
            Original: cortis-rps-chart by 쵸비
          </a>
        </footer>
      </article>

      {preparedImage && (
        <ExportPreview
          image={preparedImage}
          onClose={() =>
            setPreparedImage(
              null,
            )
          }
        />
      )}
    </main>
  );
}
