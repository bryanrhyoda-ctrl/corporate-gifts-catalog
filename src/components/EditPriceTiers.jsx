import { COLORS } from "../constants";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function EditPriceTiers({ priceTiers, setPriceTiers, onBack }) {
  const handleEdit = (oldLabel) => {
    const newLabel = prompt("Enter new label:", oldLabel);
    if (newLabel) {
      const minStr = prompt("Enter min price:");
      const maxStr = prompt("Enter max price (or leave empty for unlimited):");
      if (minStr !== null) {
        const updated = priceTiers.map(p => {
          if (p.label === oldLabel) {
            return { label: newLabel, min: parseFloat(minStr), max: maxStr === "" ? Infinity : parseFloat(maxStr) };
          }
          return p;
        });
        setPriceTiers(updated);
        setDoc(doc(db, "settings", "priceTiers"), { items: updated }, { merge: true });
        alert("✓ Updated!");
      }
    }
  };

  const handleDelete = (label) => {
    if (window.confirm("Delete this tier?")) {
      const updated = priceTiers.filter(p => p.label !== label);
      setPriceTiers(updated);
      setDoc(doc(db, "settings", "priceTiers"), { items: updated }, { merge: true });
      alert("✓ Deleted!");
    }
  };

  const backBtnStyle = {
    padding: "10px 16px",
    background: COLORS.light,
    border: `1px solid ${COLORS.gray}`,
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 600
  };

  const tierCardStyle = {
    background: COLORS.white,
    padding: 16,
    borderRadius: 8,
    border: `1px solid ${COLORS.light}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  };

  const labelStyle = { fontSize: 14, fontWeight: 700, color: COLORS.text };
  const rangeStyle = { fontSize: 12, color: COLORS.gray, marginTop: 4 };

  const editBtnStyle = {
    padding: "6px 12px",
    background: COLORS.lime,
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.darkBlue,
    marginRight: 6
  };

  const deleteBtnStyle = {
    padding: "6px 12px",
    background: "#ff6b6b",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.white
  };

  return (
    <div>
      <button onClick={onBack} style={backBtnStyle}>← Back</button>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: COLORS.darkBlue }}>Price Tiers</h2>

      <div style={{ display: "grid", gap: 12 }}>
        {priceTiers.map(pt => {
          const maxDisplay = pt.max === Infinity ? "∞" : `RM${pt.max}`;
          return (
            <div key={pt.label} style={tierCardStyle}>
              <div>
                <div style={labelStyle}>{pt.label}</div>
                <div style={rangeStyle}>RM{pt.min} – {maxDisplay}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleEdit(pt.label)} style={editBtnStyle}>Edit</button>
                <button onClick={() => handleDelete(pt.label)} style={deleteBtnStyle}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
