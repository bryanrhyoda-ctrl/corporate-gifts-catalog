import { COLORS } from "../constants";

export default function AdminMenu({ onSelectAction, onExport }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
      <button onClick={() => onSelectAction("manageProducts")} style={{ width: "100%", padding: "20px", background: COLORS.primary, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, color: COLORS.darkBlue }}>📦 MANAGE PRODUCTS</button>
      <button onClick={() => onSelectAction("addProduct")} style={{ width: "100%", padding: "20px", background: COLORS.primary, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, color: COLORS.darkBlue }}>✨ ADD PRODUCT</button>
      <button onClick={() => onSelectAction("leadTimes")} style={{ width: "100%", padding: "20px", background: COLORS.lime, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, color: COLORS.darkBlue }}>⏱️ EDIT LEAD TIMES</button>
      <button onClick={() => onSelectAction("priceTiers")} style={{ width: "100%", padding: "20px", background: COLORS.lime, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, color: COLORS.darkBlue }}>💰 EDIT PRICE TIERS</button>
      <button onClick={() => onSelectAction("categories")} style={{ width: "100%", padding: "20px", background: COLORS.purple, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, color: COLORS.white }}>📂 EDIT CATEGORIES</button>
      <button onClick={onExport} style={{ width: "100%", padding: "20px", background: COLORS.darkBlue, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16, fontWeight: 700, color: COLORS.white }}>💾 EXPORT CSV</button>
    </div>
  );
}
