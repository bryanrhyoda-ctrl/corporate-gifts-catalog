import { COLORS, OPTIONS } from "../constants";

export default function ProductCard({ product, onSelect, leadTimes }) {
  const leadLabel = leadTimes?.find(lt => lt.id === product.leadTime)?.sub || product.leadLabel || "Unknown";
  const lc = OPTIONS.leadColors[product.leadTime] || { bg: COLORS.light, text: COLORS.gray, badge: COLORS.gray };

  return (
    <div onClick={() => onSelect(product)} style={{ background: COLORS.white, borderRadius: 10, padding: "18px 20px", border: `1.5px solid ${COLORS.light}`, overflow: "hidden", cursor: "pointer", transition: "all 0.3s ease" }}>
      {product.image ? (
        <div style={{ width: "calc(100% + 40px)", height: 240, marginLeft: -20, marginTop: -18, marginBottom: 14, background: COLORS.light, overflow: "hidden" }}>
          <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      ) : (
        <div style={{ width: "calc(100% + 40px)", height: 240, marginLeft: -20, marginTop: -18, marginBottom: 14, background: COLORS.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>📦</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.gray, marginBottom: 8, textTransform: "uppercase" }}>{product.category}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{product.name}</div>
      {product.size && <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 6 }}>Size: {product.size}</div>}
      {product.material && <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 6 }}>Material: {product.material}</div>}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: lc.text, background: lc.bg, padding: "4px 10px", borderRadius: 20, border: `1px solid ${lc.badge}` }}>
          {leadLabel}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary }}>RM{parseFloat(product.price).toFixed(2)}</div>
    </div>
  );
}
