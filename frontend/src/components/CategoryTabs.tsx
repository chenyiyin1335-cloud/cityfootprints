import { CATEGORIES } from "../constants";

interface Props {
  active: string;
  onChange: (key: string) => void;
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className="category-tabs">
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          className={`category-tab ${active === c.key ? "active" : ""}`}
          onClick={() => onChange(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
