import { COLORS, OPTIONS } from "../constants";

export default function AddProduct({
  formData,
  setFormData,
  editingId,
  categories,
  leadTimes,
  priceTiers,
  newTierMoq,
  setNewTierMoq,
  newTierPrice,
  setNewTierPrice,
  dragActive,
  handleDrag,
  handleDrop,
  handleImageUpload,
  onSubmit,
  onBack,
  onAddTier,
  onRemoveTier,
}) {
  return (
    <div>
      <button onClick={onBack} style={{ padding: "10px 16px", background: COLORS.light, border: `1px solid ${COLORS.gray}`, borderRadius: 6, cursor: "pointer", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>← Back</button>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: COLORS.darkBlue }}>{editingId ? "EDIT PRODUCT" : "ADD PRODUCT"}</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
        {/* Name */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Product Name *</label>
          <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }} />
        </div>

        {/* Category */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Category *</label>
          <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }}>
            <option value="">Select category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Price & MOQ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Base Price (RM) *</label>
            <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>MOQ *</label>
            <input type="number" required value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }} />
          </div>
        </div>

        {/* Link & Size */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Website Link (optional)</label>
            <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Size (optional)</label>
            <input type="text" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }} />
          </div>
        </div>

        {/* Material & Lead Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Material (optional)</label>
            <input type="text" value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Lead Time *</label>
            <select required value={formData.leadTime} onChange={e => setFormData({...formData, leadTime: e.target.value})} style={{ width: "100%", padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }}>
              {leadTimes.map(lt => <option key={lt.id} value={lt.id}>{lt.label}</option>)}
            </select>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Image</label>
          <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} style={{ border: dragActive ? `2px solid ${COLORS.primary}` : `2px dashed ${COLORS.light}`, borderRadius: 8, padding: "30px", textAlign: "center", background: dragActive ? `${COLORS.primary}10` : COLORS.light, cursor: "pointer" }}>
            <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files?.[0])} style={{ display: "none" }} id="imageUploadInput" />
            <label htmlFor="imageUploadInput" style={{ cursor: "pointer", fontSize: 14 }}>Drag or click to upload</label>
          </div>
          {formData.image && (
            <div style={{ marginTop: 12, fontSize: 12, color: COLORS.gray }}>
              ✓ Image selected
            </div>
          )}
        </div>

        {/* Printing Options */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Printing Options *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {OPTIONS.printing.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  const newPrinting = formData.printing.includes(option)
                    ? formData.printing.filter(p => p !== option)
                    : [...formData.printing, option];
                  setFormData({...formData, printing: newPrinting});
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: formData.printing.includes(option) ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.light}`,
                  background: formData.printing.includes(option) ? `${COLORS.primary}20` : COLORS.white,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: formData.printing.includes(option) ? COLORS.primary : COLORS.gray
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Tiers */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 8 }}>Pricing Tiers (optional)</label>
          {formData.pricingTiers.length > 0 && (
            <div style={{ background: COLORS.light, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              {formData.pricingTiers.map((tier, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: idx < formData.pricingTiers.length - 1 ? 8 : 0 }}>
                  <span style={{ fontSize: 12, color: COLORS.text }}>MOQ {tier.moq}: RM{parseFloat(tier.price).toFixed(2)}</span>
                  <button type="button" onClick={() => onRemoveTier(idx)} style={{ padding: "4px 8px", background: "#ff6b6b", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, color: COLORS.white }}>Remove</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="number" placeholder="MOQ" value={newTierMoq} onChange={e => setNewTierMoq(e.target.value)} style={{ flex: 1, padding: "10px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 13 }} />
            <input type="number" step="0.01" placeholder="Price (RM)" value={newTierPrice} onChange={e => setNewTierPrice(e.target.value)} style={{ flex: 1, padding: "10px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 13 }} />
            <button type="button" onClick={onAddTier} style={{ padding: "10px 16px", background: COLORS.lime, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, color: COLORS.darkBlue }}>Add</button>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" style={{ flex: 1, padding: "14px 24px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{editingId ? "UPDATE" : "ADD"}</button>
          <button type="button" onClick={onBack} style={{ flex: 1, padding: "14px 24px", background: COLORS.light, color: COLORS.text, border: `1px solid ${COLORS.gray}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
