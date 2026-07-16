"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type PreparedImage = {
  blob: Blob;
  url: string;
  filename: string;
  width: number;
  height: number;
  alt: string;
};

type ExportPreviewProps = {
  image: PreparedImage;
  onClose: () => void;
};

export function ExportPreview({ image, onClose }: ExportPreviewProps) {
  const [activeAction, setActiveAction] = useState<"share" | "open" | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function downloadFallback() {
    const link = document.createElement("a");
    link.href = image.url;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function saveAndShare() {
    if (activeAction) return;
    setShareMessage("");
    setActiveAction("share");

    try {
      const file = new File([image.blob], image.filename, { type: "image/png" });
      const shareData: ShareData = {
        files: [file],
        title: "핱페스 취향표",
        text: "핱페스 취향표",
      };
      const canShareFiles = typeof navigator.share === "function"
        && (typeof navigator.canShare !== "function" || navigator.canShare(shareData));

      if (!canShareFiles) {
        downloadFallback();
        setShareMessage("이 기기에서는 공유 메뉴를 열 수 없어 이미지를 저장했어요.");
        return;
      }

      await navigator.share(shareData);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("저장 및 공유 메뉴를 열지 못했어요. 아래 이미지를 길게 눌러 저장해 주세요.");
    } finally {
      setActiveAction(null);
    }
  }

  function openImage() {
    if (activeAction) return;
    setShareMessage("");
    setActiveAction("open");
    const opened = window.open(image.url, "_blank", "noopener,noreferrer");
    if (!opened) setShareMessage("이미지를 열 수 없어요. 팝업 차단을 확인해 주세요.");
    setActiveAction(null);
  }

  return (
    <div
      className="export-preview-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="export-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-preview-title"
        aria-describedby="export-preview-description"
      >
        <header className="export-preview-header">
          <h2 id="export-preview-title">이미지가 준비됐어요</h2>
          <p id="export-preview-description">
            저장 및 공유를 누른 뒤 X를 선택하세요. 이미지와 “핱페스 취향표” 문구를 함께 전달해요.
          </p>
        </header>

        <div className="export-preview-actions">
          <button
            ref={primaryButtonRef}
            className="export-share-button"
            type="button"
            onClick={saveAndShare}
            disabled={activeAction !== null}
          >
            {activeAction === "share" ? "메뉴 여는 중…" : "저장 및 공유"}
          </button>
          <button
            className="export-open-button"
            type="button"
            onClick={openImage}
            disabled={activeAction !== null}
          >
            {activeAction === "open" ? "여는 중…" : "이미지 열기"}
          </button>
          <button
            className="export-close-button"
            type="button"
            onClick={onClose}
            disabled={activeAction !== null}
          >
            닫기
          </button>
        </div>

        {shareMessage && <p className="export-share-message" role="status">{shareMessage}</p>}

        <div className="export-image-preview">
          <Image
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            unoptimized
            priority
          />
        </div>
      </section>
    </div>
  );
}
