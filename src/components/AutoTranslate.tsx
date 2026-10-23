"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { TH_EN } from "@/lib/translations";

/**
 * DOM-level Thai→English translator.
 *
 * The UI is written in Thai; when the user picks English we walk text nodes and
 * replace whole phrases found in the dictionary. A MutationObserver re-applies
 * it to content rendered after navigation / data loads.
 *
 * We store each text node's original Thai in a WeakMap so switching back to Thai
 * restores it exactly, and so re-translation never compounds.
 */
const originals = new WeakMap<Text, string>();

// Longest phrases first so specific phrases win over generic substrings.
const ENTRIES = Object.entries(TH_EN).sort((a, b) => b[0].length - a[0].length);
// Only phrases this long are safe to replace as substrings inside a larger
// text node. Shorter words must match the WHOLE (trimmed) node to avoid
// corrupting unrelated Thai words that happen to contain them.
const SUBSTRING_MIN = 8;

function translateText(src: string): string {
  const trimmed = src.trim();
  // 1) Exact whole-node match (handles short words safely, preserves padding).
  const exact = TH_EN[trimmed];
  if (exact !== undefined) return src.replace(trimmed, exact);

  // 2) Substring replacement, but only for sufficiently long phrases.
  let out = src;
  for (const [th, en] of ENTRIES) {
    if (th.length >= SUBSTRING_MIN && out.includes(th)) out = out.split(th).join(en);
  }
  return out;
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);

function walk(root: Node, toEnglish: boolean) {
  const win = root.ownerDocument?.defaultView ?? window;
  const filter = {
    acceptNode(node: Node) {
      const parent = (node as Text).parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      // Skip inputs the user types into.
      if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
      const v = node.nodeValue ?? "";
      return v.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  };
  const tw = win.document.createTreeWalker(root, NodeFilter.SHOW_TEXT, filter as any);
  const nodes: Text[] = [];
  let n = tw.nextNode();
  while (n) {
    nodes.push(n as Text);
    n = tw.nextNode();
  }
  for (const node of nodes) {
    if (toEnglish) {
      const orig = originals.get(node) ?? node.nodeValue ?? "";
      if (!originals.has(node)) originals.set(node, orig);
      const translated = translateText(orig);
      if (node.nodeValue !== translated) node.nodeValue = translated;
    } else {
      const orig = originals.get(node);
      if (orig != null && node.nodeValue !== orig) node.nodeValue = orig;
    }
  }
}

export default function AutoTranslate() {
  const { lang } = useI18n();

  useEffect(() => {
    const toEnglish = lang === "en";
    // Apply now.
    walk(document.body, toEnglish);

    // Re-apply on DOM changes (route changes, async data, modals).
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        walk(document.body, toEnglish);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [lang]);

  return null;
}
