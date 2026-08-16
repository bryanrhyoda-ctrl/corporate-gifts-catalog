import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { COLORS } from "../constants";

export default function ManageProducts({ products, onEdit, onBack }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (window.confirm("Delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        alert("✓ Deleted!");
      } catch (error) {
        alert("Error: " + error.message);
      }
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

      <input
        type="text"
        placeholder="Search products..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: 16, border: `1px solid ${COLORS.light}`, borderRadius: 6, fontSize: 14 }}
      />

      <div style={{ overflowX: "auto", background: COLORS.white, borderRadius: 8, border: `1px solid ${COLORS.light}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.light }}>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: COLORS.text }}>Name</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: COLORS.text }}>Category</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: COLORS.text }}>Price</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: COLORS.text }}>Size</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 600, color: COLORS.text }}>Material</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: 600, color: COLORS.text }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.firestoreId} style={{ borderTop: `1px solid ${COLORS.light}` }}>
                <td style={{ padding: "12px", fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: "12px", fontSize: 13, color: COLORS.text }}>{p.category}</td>
                <td style={{ padding: "12px", fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>RM{parseFloat(p.price).toFixed(2)}</td>
                <td style={{ padding: "12px", fontSize: 13, color: COLORS.text }}>{p.size || "—"}</td>
                <td style={{ padding: "12px", fontSize: 13, color: COLORS.text }}>{p.material || "—"}</td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <button onClick={() => onEdit(p)} style={editBtnStyle}>Edit</button>
                  <button onClick={() => handleDelete(p.firestoreId)} style={deleteBtnStyle}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: COLORS.gray }}>Total: {filtered.length} products</div>
    </div>
  );
}
