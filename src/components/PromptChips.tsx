"use client";

import { useRef, useState } from "react";
import {
  DEFAULT_WEIGHT,
  WEIGHT_MAX,
  WEIGHT_MIN,
  WEIGHT_STEP,
  clampWeight,
  sanitisePartText,
  type PromptPart,
} from "@/lib/promptParts";

/**
 * Weighted prompt editor: each phrase is a chip with − / + weight controls,
 * copy and remove. Enter or comma commits the typed text as a new chip.
 */
export default function PromptChips({
  parts,
  onChange,
  placeholder,
  maxLen,
  id,
  tone = "positive",
}: {
  parts: PromptPart[];
  onChange: (parts: PromptPart[]) => void;
  placeholder?: string;
  maxLen?: number;
  id?: string;
  tone?: "positive" | "negative";
}) {
  const [draft, setDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const used = parts.reduce((n, p) => n + p.text.length + 2, 0);
  const full = maxLen !== undefined && used >= maxLen;

  function commit(raw: string) {
    const text = sanitisePartText(raw);
    if (!text) return;
    if (maxLen !== undefined && used + text.length > maxLen) return;
    onChange([...parts, { text, weight: DEFAULT_WEIGHT }]);
    setDraft("");
  }

  function update(i: number, patch: Partial<PromptPart>) {
    onChange(parts.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function remove(i: number) {
    onChange(parts.filter((_, idx) => idx !== i));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && parts.length) {
      e.preventDefault();
      remove(parts.length - 1);
    }
  }

  function saveEdit() {
    if (editIdx === null) return;
    const text = sanitisePartText(editText);
    if (text) update(editIdx, { text });
    else remove(editIdx);
    setEditIdx(null);
  }

  return (
    <div className={`chips ${tone}`} onClick={() => inputRef.current?.focus()}>
      {parts.map((p, i) => (
        <span className="chip" key={`${i}-${p.text}`}>
          {editIdx === i ? (
            <input
              className="chip-edit"
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === "Escape") setEditIdx(null);
              }}
            />
          ) : (
            <button
              type="button"
              className="chip-text"
              title="คลิกเพื่อแก้ไขข้อความ"
              onClick={(e) => {
                e.stopPropagation();
                setEditIdx(i);
                setEditText(p.text);
              }}
            >
              {p.text}
            </button>
          )}

          <span className="chip-weight">
            <button
              type="button"
              title="ลดน้ำหนัก"
              aria-label="ลดน้ำหนัก"
              disabled={p.weight <= WEIGHT_MIN}
              onClick={(e) => {
                e.stopPropagation();
                update(i, { weight: clampWeight(p.weight - WEIGHT_STEP) });
              }}
            >
              −
            </button>
            <b>{p.weight.toFixed(1)}</b>
            <button
              type="button"
              title="เพิ่มน้ำหนัก"
              aria-label="เพิ่มน้ำหนัก"
              disabled={p.weight >= WEIGHT_MAX}
              onClick={(e) => {
                e.stopPropagation();
                update(i, { weight: clampWeight(p.weight + WEIGHT_STEP) });
              }}
            >
              +
            </button>
          </span>

          <button
            type="button"
            className="chip-btn"
            title="ทำซ้ำ"
            aria-label="ทำซ้ำ"
            onClick={(e) => {
              e.stopPropagation();
              onChange([...parts.slice(0, i + 1), { ...p }, ...parts.slice(i + 1)]);
            }}
          >
            ⧉
          </button>
          <button
            type="button"
            className="chip-btn"
            title="ลบ"
            aria-label="ลบ"
            onClick={(e) => {
              e.stopPropagation();
              remove(i);
            }}
          >
            ✕
          </button>
        </span>
      ))}

      <input
        id={id}
        ref={inputRef}
        className="chips-input"
        value={draft}
        placeholder={parts.length === 0 ? placeholder : full ? "ครบความยาวสูงสุด" : "เพิ่มอีก..."}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        disabled={full}
      />
    </div>
  );
}
