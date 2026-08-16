import { COLORS, OPTIONS } from "../constants";

export default function ProductDetailPanel({ product, onClose }) {
  const lc = OPTIONS.leadColors[product.leadTime] || { bg: COLORS.light, text: COLORS.gray, badge: COLORS.gray };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }} />

      {/* Panel */}
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, background: COLORS.white, boxShadow: "-4px 0 12px rgba(0,0,0,0.15)", zIndex: 999, overflowY: "auto" }}>
        <div style={{ padding: "20px" }}>
          {/* Close Button */}
          <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: COLORS.gray }}>✕</button>

          {/* Image */}
          {product.image && (
            <div style={{ width: "100%", height: 280, background: COLORS.light, borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
              <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          )}

          {/* Details */}
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.gray, marginBottom: 8, textTransform: "uppercase" }}>{product.category}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, marginBottom: 12 }}>{product.name}</h2>

          {product.size && <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>📏 Size: <strong>{product.size}</strong></div>}
          {product.material && <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>🧵 Material: <strong>{product.material}</strong></div>}

          {/* Lead Time Badge */}
          <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
            ⏱️ Lead Time:
            <span style={{ fontSize: 12, fontWeight: 600, color: lc.text, background: lc.bg, padding: "6px 12px", borderRadius: 20, border: `1px solid ${lc.badge}`, marginLeft: 8, display: "inline-block" }}>
              {product.leadLabel}
            </span>
          </div>

          {/* Price */}
          <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary, marginBottom: 12 }}>RM{parseFloat(product.price).toFixed(2)}</div>

          {/* MOQ */}
          <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
            MOQ: <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.purple }}>{product.moq}</span>
          </div>

          {/* Pricing Tiers */}
          {product.pricingTiers && product.pricingTiers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>PRICING TIERS</div>
              <div style={{ background: COLORS.light, borderRadius: 8, padding: 12 }}>
                {product.pricingTiers.map((tier, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: COLORS.text, marginBottom: idx < product.pricingTiers.length - 1 ? 8 : 0, paddingBottom: idx < product.pricingTiers.length - 1 ? 8 : 0, borderBottom: idx < product.pricingTiers.length - 1 ? `1px solid ${COLORS.light}` : "none" }}>
                    <strong>MOQ {tier.moq}:</strong> <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary }}>RM{parseFloat(tier.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Printing Options */}
          {product.printing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>PRINTING OPTIONS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {product.printing.split(", ").map((option, idx) => (
                  <span key={idx} style={{ fontSize: 11, fontWeight: 600, color: COLORS.primary, background: `${COLORS.primary}10`, padding: "6px 12px", borderRadius: 20, border: `1px solid ${COLORS.primary}` }}>
                    {option}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Website Link */}
          {product.link && (
            <a href={product.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", fontSize: 13, color: COLORS.primary, fontWeight: 600, marginTop: 12, textDecoration: "none" }}>
              View Website →
            </a>
          )}
        </div>
      </div>
    </>
  );
}
