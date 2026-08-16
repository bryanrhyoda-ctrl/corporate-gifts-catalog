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
        const updated = priceTiers.map(p => 
          p.label === oldLabel 
            ? { label: newLabel, min: parseFloat(minStr), max: maxStr === "" ? Infinity : parseFloat(maxStr) }
            : p
        );
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

  return (
    <div>
      <button onClick={onBack} style={{ padding: "10px 16px", background: COLORS.light, border: `1px solid ${COLORS.gray}`, borderRadius: 6, cursor: "pointer", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>← Back</button>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: COLORS.darkBlue }}>Price Tiers</h2>

      <div style={{ display: "grid", gap: 12 }}>
        {priceTiers.map(pt => (
          <div key={pt.label} style={{ background: COLORS.white, padding: 16, borderRadius: 8, border: `1px solid ${COLORS.light}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{pt.label}</div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>RM{pt.min} – {pt.max === Infinity ? "∞" : "RM" + pt.max}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleEdit(pt.label)} style={{ padding: "6px 12px", background: COLORS.lime, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, color: COLORS.darkBlue }}>Edit</button>
              <button onClick={() => handleDelete(pt.label)} style={{ padding: "6px 12px", background: "#ff6b6b", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, color: COLORS.white }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
