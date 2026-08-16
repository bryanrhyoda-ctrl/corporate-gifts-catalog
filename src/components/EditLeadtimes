import { COLORS, DEFAULTS } from "../constants";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function EditLeadTimes({ leadTimes, setLeadTimes, onBack }) {
  const handleEdit = (id) => {
    const newLabel = prompt("Enter new label:", leadTimes.find(lt => lt.id === id)?.label);
    if (newLabel) {
      const newSub = prompt("Enter new sub-label:", leadTimes.find(lt => lt.id === id)?.sub);
      if (newSub) {
        const updated = leadTimes.map(l => l.id === id ? { id, label: newLabel, sub: newSub } : l);
        setLeadTimes(updated);
        setDoc(doc(db, "settings", "leadTimes"), { items: updated }, { merge: true });
        alert("✓ Updated!");
      }
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this lead time?")) {
      const updated = leadTimes.filter(lt => lt.id !== id);
      setLeadTimes(updated);
      setDoc(doc(db, "settings", "leadTimes"), { items: updated }, { merge: true });
      alert("✓ Deleted!");
    }
  };

  return (
    <div>
      <button onClick={onBack} style={{ padding: "10px 16px", background: COLORS.light, border: `1px solid ${COLORS.gray}`, borderRadius: 6, cursor: "pointer", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>← Back</button>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: COLORS.darkBlue }}>Lead Times</h2>

      <div style={{ display: "grid", gap: 12 }}>
        {leadTimes.map(lt => (
          <div key={lt.id} style={{ background: COLORS.white, padding: 16, borderRadius: 8, border: `1px solid ${COLORS.light}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{lt.label}</div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>{lt.sub}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleEdit(lt.id)} style={{ padding: "6px 12px", background: COLORS.lime, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, color: COLORS.darkBlue }}>Edit</button>
              <button onClick={() => handleDelete(lt.id)} style={{ padding: "6px 12px", background: "#ff6b6b", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, color: COLORS.white }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
