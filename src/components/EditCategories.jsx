import { useState } from "react";
import { COLORS } from "../constants";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function EditCategories({ categoryList, setCategoryList, onBack }) {
  const [newCategory, setNewCategory] = useState("");

  const handleAdd = () => {
    if (newCategory.trim()) {
      const updated = [...categoryList, newCategory];
      setCategoryList(updated);
      setDoc(doc(db, "settings", "categories"), { items: updated }, { merge: true });
      alert("✓ Added!");
      setNewCategory("");
    }
  };

  const handleEdit = (oldName) => {
    const newName = prompt("Enter new name:", oldName);
    if (newName) {
      const updated = categoryList.map(c => c === oldName ? newName : c);
      setCategoryList(updated);
      setDoc(doc(db, "settings", "categories"), { items: updated }, { merge: true });
      alert("✓ Updated!");
    }
  };

  const handleDelete = (name) => {
    if (window.confirm("Delete this category?")) {
      const updated = categoryList.filter(c => c !== name);
      setCategoryList(updated);
      setDoc(doc(db, "settings", "categories"), { items: updated }, { merge: true });
      alert("✓ Deleted!");
    }
  };

  return (
    <div>
      <button onClick={onBack} style={{ padding: "10px 16px", background: COLORS.light, border: `1px solid ${COLORS.gray}`, borderRadius: 6, cursor: "pointer", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>← Back</button>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: COLORS.darkBlue }}>Categories</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="New category name"
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          style={{ flex: 1, padding: "12px", border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }}
        />
        <button onClick={handleAdd} style={{ padding: "12px 24px", background: COLORS.primary, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, color: COLORS.darkBlue }}>Add</button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {categoryList.map(cat => (
          <div key={cat} style={{ background: COLORS.white, padding: 16, borderRadius: 8, border: `1px solid ${COLORS.light}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{cat}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleEdit(cat)} style={{ padding: "6px 12px", background: COLORS.lime, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, color: COLORS.darkBlue }}>Edit</button>
              <button onClick={() => handleDelete(cat)} style={{ padding: "6px 12px", background: "#ff6b6b", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, color: COLORS.white }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
