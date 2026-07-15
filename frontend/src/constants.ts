export interface CategoryDef {
  key: string;
  label: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: "all", label: "全部" },
  { key: "restaurant", label: "餐饮" },
  { key: "cafe", label: "咖啡" },
  { key: "bookstore", label: "书店" },
  { key: "leisure", label: "休闲" },
];

export function categoryLabel(key?: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label || key || "其他";
}
