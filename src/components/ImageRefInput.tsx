"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./ui";

/**
 * One reference-image slot: upload (drag/drop or click) or paste a URL.
 * Used for both img_ref_0 and img_ref_1 in the studio.
 */
export default function ImageRefInput({
  label,
  required,
  value,
  onChange,
  onError,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
  onError: (msg: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError("กรุณาเลือกไฟล์รูปภาพ");
    onError(null);
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } catch (e: any) {
      onError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="field">
      <div className="row between">
        <span className="label">
          {label} {required ? <span className="neg">*</span> : <span className="muted">(ไม่บังคับ)</span>}
        </span>
        <button type="button" className="btn ghost sm" onClick={() => setUrlMode((v) => !v)}>
          {urlMode ? "อัปโหลดไฟล์" : "ใช้ URL"}
        </button>
      </div>

      {value ? (
        <div className="ref-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} />
          <button type="button" className="btn sm danger remove" onClick={() => onChange("")}>
            ✕ ลบ
          </button>
        </div>
      ) : urlMode ? (
        <input
          className="input"
          type="url"
          placeholder="https://example.com/image.png"
          onBlur={(e) => onChange(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onChange((e.target as HTMLInputElement).value.trim());
            }
          }}
        />
      ) : (
        <label
          className={`dropzone ${drag ? "drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={uploading}
          />
          {uploading ? (
            <>
              <span className="spinner" /> <div className="small">กำลังอัปโหลด...</div>
            </>
          ) : (
            <>
              <div className="ic">📤</div>
              <div className="small">
                <b style={{ color: "var(--text)" }}>คลิกเพื่อเลือกรูป</b> หรือลากไฟล์มาวาง
              </div>
              <div className="xs">PNG, JPG, WEBP · สูงสุด 10MB</div>
            </>
          )}
        </label>
      )}
    </div>
  );
}
