import raw from "../../data/cet4.json";
import exRaw from "../../data/examples.json";
import type { ExItem, Word } from "./marks";

/** 词条顺序即 v1 的「网站词频顺序」；默认排序就按这个数组走 */
export const DATA = raw as unknown as Word[];
export const EX = exRaw as unknown as Record<string, ExItem[]>;

export function exOf(w: Word): ExItem[] {
  return EX[String(w[0])] || EX[String(w[0] || "").toLowerCase()] || [];
}
