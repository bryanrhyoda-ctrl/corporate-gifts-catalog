import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNUhJDS5omotKq2c9ueb0p6MRUmktSZB8",
  authDomain: "corporate-gifts-catalog.firebaseapp.com",
  projectId: "corporate-gifts-catalog",
  storageBucket: "corporate-gifts-catalog.firebasestorage.app",
  messagingSenderId: "363640826064",
  appId: "1:363640826064:web:bcf1ff57345bea316ed6d5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_LEAD_TIMES = [
  { id: "L1", label: "Ready Stock", sub: "1–3 days" },
  { id: "L2", label: "Local Prod", sub: "5–7 days" },
  { id: "L3", label: "Import", sub: "2–3 weeks" },
  { id: "L4", label: "Custom", sub: "4–6 weeks" },
];

const DEFAULT_PRICE_TIERS = [
  { label: "Below RM5", min: 0, max: 5 },
  { label: "RM5 – RM15", min: 5, max: 15 },
  { label: "RM15 – RM50", min: 15, max: 50 },
  { label: "RM50 – RM150", min: 50, max: 150 },
  { label: "Above RM150", min: 150, max: Infinity },
];

const BRANDING_OPTIONS = ["Silkscreen", "Laser", "Emboss", "Deboss", "Print", "Full Print", "Custom Box", "Heat Transfer"];

const LEAD_COLORS = {
  L1: { bg: "#dcfce7", text: "#15803d", dot: "#16a34a" },
  L2: { bg: "#dbeafe", text: "#1d4ed8", dot: "#2563eb" },
  L3: { bg: "#fef9c3", text: "#a16207", dot: "#ca8a04" },
  L4: { bg: "#fee2e2", text: "#b91c1c", dot: "#dc2626" },
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadTimes, setLeadTimes] = useState(() => {
    const saved = localStorage.getItem('catalogLeadTimes');
    return saved ? JSON.parse(saved) : DEFAULT_LEAD_TIMES;
  });
  const [priceTiers, setPriceTiers] = useState(() => {
    const saved = localStorage.getItem('catalogPriceTiers');
    return saved ? JSON.parse(saved) : DEFAULT_PRICE_TIERS;
  });
  const [categoryList, setCategoryList] = useState(() => {
    const saved = localStorage.getItem('catalogCategories');
    return saved ? JSON.parse(saved) : ["Electronic", "Bottle", "Stationery"];
  });

  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showLeadTimes, setShowLeadTimes] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showPriceTiers, setShowPriceTiers] = useState(false);
  
  const [newLeadTimeId, setNewLeadTimeId] = useState("");
  const [newLeadTimeLabel, setNewLeadTimeLabel] = useState("");
  const [newLeadTimeSub, setNewLeadTimeSub] = useState("");
  const [editingLeadTimeId, setEditingLeadTimeId] = useState(null);
  const [editLeadLabel, setEditLeadLabel] = useState("");
  const [editLeadSub, setEditLeadSub] = useState("");

  const [newPriceTierLabel, setNewPriceTierLabel] = useState("");
  const [newPriceTierMin, setNewPriceTierMin] = useState("");
  const [newPriceTierMax, setNewPriceTierMax] = useState("");
  const [editingPriceTierLabel, setEditingPriceTierLabel] = useState(null);
  const [editPriceLabel, setEditPriceLabel] = useState("");
  const [editPriceMin, setEditPriceMin] = useState("");
  const [editPriceMax, setEditPriceMax] = useState("");
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Electronic",
    price: "",
    leadTime: "L1",
    moq: "",
    image: "",
    branding: [],
  });

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsArray = [];
      querySnapshot.forEach((doc) => {
        productsArray.push({ firestoreId: doc.id, ...doc.data() });
      });
      setProducts(productsArray);
      setLoading(false);
    }, (error) => {
      console.error("Error loading products:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('catalogLeadTimes', JSON.stringify(leadTimes));
  }, [leadTimes]);

  useEffect(() => {
    localStorage.setItem('catalogPriceTiers', JSON.stringify(priceTiers));
  }, [priceTiers]);

  useEffect(() => {
    localStorage.setItem('catalogCategories', JSON.stringify(categoryList));
  }, [categoryList]);

  const categories = categoryList.sort();

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (selectedPrice) {
        const tier = priceTiers.find(t => t.label === selectedPrice);
        if (tier) {
          const max = tier.max === Infinity ? Infinity : tier.max;
          if (p.price < tier.min || p.price >= max) return false;
        }
      }
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedLead && p.leadTime !== selectedLead) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, selectedPrice, selectedCategory, selectedLead, search, priceTiers]);

  const clearAll = () => {
    setSelectedPrice(null);
    setSelectedCategory(null);
    setSelectedLead(null);
    setSearch("");
  };

  const handleAdminLogin = () => {
    if (adminPassword === "admin123") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword("");
    } else {
      alert("❌ Wrong password");
      setAdminPassword("");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setShowForm(false);
    setShowLeadTimes(false);
    setShowCategories(false);
    setShowPriceTiers(false);
    setEditingId(null);
  };

  const handleAddOrEditProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.moq || formData.branding.length === 0) {
      alert("Fill all fields!");
      return;
    }

    const productData = {
      name: formData.name,
      category: formData.category,
      price: parseInt(formData.price),
      leadTime: formData.leadTime,
      leadLabel: leadTimes.find(lt => lt.id === formData.leadTime)?.sub,
      moq: parseInt(formData.moq),
      image: formData.image,
      branding: formData.branding.join(", "),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "products", editingId), productData);
        alert("✓ Updated!");
      } else {
        await addDoc(collection(db, "products"), productData);
        alert("✓ Added!");
      }
      resetForm();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", category: "Electronic", price: "", leadTime: "L1", moq: "", image: "", branding: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const startEditProduct = (product) => {
    if (!isAdmin) return;
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      leadTime: product.leadTime,
      moq: product.moq.toString(),
      image: product.image,
      branding: product.branding ? product.branding.split(", ").map(b => b.trim()) : [],
    });
    setEditingId(product.firestoreId);
    setShowForm(true);
  };

  const deleteProduct = async (firestoreId) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete?")) return;
    try {
      await deleteDoc(doc(db, "products", firestoreId));
      alert("✓ Deleted!");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const toggleBranding = (brand) => {
    setFormData(prev => ({
      ...prev,
      branding: prev.branding.includes(brand)
        ? prev.branding.filter(b => b !== brand)
        : [...prev.branding, brand]
    }));
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, image: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Price Tiers: Add
  const addPriceTier = () => {
    if (!newPriceTierLabel.trim() || newPriceTierMin === "" || newPriceTierMax === "") {
      alert("Fill all fields");
      return;
    }
    const min = parseFloat(newPriceTierMin);
    const max = newPriceTierMax === "Infinity" ? Infinity : parseFloat(newPriceTierMax);
    if (isNaN(min) || (max !== Infinity && isNaN(max))) {
      alert("Invalid numbers");
      return;
    }
    if (priceTiers.find(pt => pt.label === newPriceTierLabel)) {
      alert("Already exists!");
      return;
    }
    setPriceTiers([...priceTiers, { label: newPriceTierLabel, min, max }]);
    setNewPriceTierLabel("");
    setNewPriceTierMin("");
    setNewPriceTierMax("");
    alert("✓ Added!");
  };

  // Price Tiers: Edit
  const editPriceTier = (label) => {
    const pt = priceTiers.find(p => p.label === label);
    setEditingPriceTierLabel(label);
    setEditPriceLabel(pt.label);
    setEditPriceMin(pt.min.toString());
    setEditPriceMax(pt.max === Infinity ? "Infinity" : pt.max.toString());
  };

  // Price Tiers: Save Edit
  const savePriceTierEdit = () => {
    if (!editPriceLabel.trim() || editPriceMin === "" || editPriceMax === "") {
      alert("Fill all fields");
      return;
    }
    const min = parseFloat(editPriceMin);
    const max = editPriceMax === "Infinity" ? Infinity : parseFloat(editPriceMax);
    if (isNaN(min) || (max !== Infinity && isNaN(max))) {
      alert("Invalid numbers");
      return;
    }
    if (editPriceLabel !== editingPriceTierLabel && priceTiers.find(pt => pt.label === editPriceLabel)) {
      alert("Already exists!");
      return;
    }
    setPriceTiers(priceTiers.map(pt => 
      pt.label === editingPriceTierLabel 
        ? { label: editPriceLabel, min, max }
        : pt
    ));
    setEditingPriceTierLabel(null);
    setEditPriceLabel("");
    setEditPriceMin("");
    setEditPriceMax("");
    alert("✓ Updated!");
  };

  // Price Tiers: Cancel Edit
  const cancelPriceTierEdit = () => {
    setEditingPriceTierLabel(null);
    setEditPriceLabel("");
    setEditPriceMin("");
    setEditPriceMax("");
  };

  // Price Tiers: Delete
  const deletePriceTier = (label) => {
    setPriceTiers(priceTiers.filter(pt => pt.label !== label));
    alert("✓ Deleted!");
  };

  // Lead Times: Add New
  const addLeadTime = () => {
    if (!newLeadTimeId.trim() || !newLeadTimeLabel.trim()) {
      alert("Fill ID and label");
      return;
    }
    if (leadTimes.find(lt => lt.id === newLeadTimeId)) {
      alert("ID exists!");
      return;
    }
    setLeadTimes([...leadTimes, { id: newLeadTimeId, label: newLeadTimeLabel, sub: newLeadTimeSub }]);
    setNewLeadTimeId("");
    setNewLeadTimeLabel("");
    setNewLeadTimeSub("");
    alert("✓ Added!");
  };

  const editLeadTime = (id) => {
    const lt = leadTimes.find(l => l.id === id);
    setEditingLeadTimeId(id);
    setEditLeadLabel(lt.label);
    setEditLeadSub(lt.sub);
  };

  const saveLeadTimeEdit = () => {
    if (!editLeadLabel.trim()) {
      alert("Fill label");
      return;
    }
    setLeadTimes(leadTimes.map(lt => 
      lt.id === editingLeadTimeId 
        ? { id: lt.id, label: editLeadLabel, sub: editLeadSub }
        : lt
    ));
    setEditingLeadTimeId(null);
    setEditLeadLabel("");
    setEditLeadSub("");
    alert("✓ Updated!");
  };

  const cancelLeadTimeEdit = () => {
    setEditingLeadTimeId(null);
    setEditLeadLabel("");
    setEditLeadSub("");
  };

  const deleteLeadTime = (id) => {
    const productsUsing = products.filter(p => p.leadTime === id);
    if (productsUsing.length > 0) {
      alert(`Can't delete - ${productsUsing.length} products use this`);
      return;
    }
    setLeadTimes(leadTimes.filter(lt => lt.id !== id));
    alert("✓ Deleted!");
  };

  // Categories: Add New
  const addCategory = () => {
    if (!newCategoryName.trim()) {
      alert("Enter category name");
      return;
    }
    if (categoryList.includes(newCategoryName)) {
      alert("Already exists!");
      return;
    }
    setCategoryList([...categoryList, newCategoryName]);
    setNewCategoryName("");
    alert("✓ Added!");
  };

  const editCategory = (oldName) => {
    setEditingCategoryName(oldName);
    setNewCategoryName(oldName);
  };

  const saveCategoryEdit = () => {
    if (!newCategoryName.trim()) {
      alert("Enter name");
      return;
    }
    if (newCategoryName !== editingCategoryName && categoryList.includes(newCategoryName)) {
      alert("Already exists!");
      return;
    }
    setCategoryList(categoryList.map(c => c === editingCategoryName ? newCategoryName : c));
    setProducts(products.map(p => p.category === editingCategoryName ? { ...p, category: newCategoryName } : p));
    setEditingCategoryName(null);
    setNewCategoryName("");
    alert("✓ Updated!");
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryName(null);
    setNewCategoryName("");
  };

  const deleteCategory = (name) => {
    const productsUsing = products.filter(p => p.category === name);
    if (productsUsing.length > 0) {
      alert(`Can't delete - ${productsUsing.length} products use this`);
      return;
    }
    setCategoryList(categoryList.filter(c => c !== name));
    alert("✓ Deleted!");
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 20px" }}>Loading...</div>;
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "0 0 60px" }}>
      {showAdminLogin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 20 }}>Admin Login</h2>
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} onKeyPress={e => e.key === "Enter" && handleAdminLogin()} placeholder="Password" style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, marginBottom: 16, fontFamily: "inherit" }} autoFocus />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAdminLogin} style={{ flex: 1, padding: "10px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Login</button>
              <button onClick={() => { setShowAdminLogin(false); setAdminPassword(""); }} style={{ flex: 1, padding: "10px 16px", background: "#ddd", color: "#1a1a1a", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPriceTiers && isAdmin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 700, width: "90%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 20 }}>💰 Price Tiers</h2>
            
            {/* Add New */}
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Add New</h3>
              <input type="text" value={newPriceTierLabel} onChange={e => setNewPriceTierLabel(e.target.value)} placeholder="Label (e.g., Budget)" style={{ width: "100%", boxSizing: "border-box", padding: "10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, fontFamily: "inherit" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input type="number" value={newPriceTierMin} onChange={e => setNewPriceTierMin(e.target.value)} placeholder="Min (0)" style={{ padding: "10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit" }} />
                <input type="text" value={newPriceTierMax} onChange={e => setNewPriceTierMax(e.target.value)} placeholder="Max (or Infinity)" style={{ padding: "10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, fontFamily: "inherit" }} />
              </div>
              <button onClick={addPriceTier} style={{ width: "100%", padding: "10px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
            </div>

            {/* List */}
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 10 }}>Current</h3>
            {priceTiers.map(pt => (
              <div key={pt.label} style={{ marginBottom: 10 }}>
                {editingPriceTierLabel === pt.label ? (
                  // EDITING MODE
                  <div style={{ display: "grid", gap: 8, padding: 12, background: "#fffbf7", borderRadius: 6, border: "1px solid #c8a96e" }}>
                    <input type="text" value={editPriceLabel} onChange={e => setEditPriceLabel(e.target.value)} placeholder="Label" style={{ padding: "8px", fontSize: 13, border: "1px solid #c8a96e", borderRadius: 4, fontFamily: "inherit" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input type="number" value={editPriceMin} onChange={e => setEditPriceMin(e.target.value)} placeholder="Min" style={{ padding: "8px", fontSize: 13, border: "1px solid #c8a96e", borderRadius: 4, fontFamily: "inherit" }} />
                      <input type="text" value={editPriceMax} onChange={e => setEditPriceMax(e.target.value)} placeholder="Max" style={{ padding: "8px", fontSize: 13, border: "1px solid #c8a96e", borderRadius: 4, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={savePriceTierEdit} style={{ flex: 1, padding: "8px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✓ Save</button>
                      <button onClick={cancelPriceTierEdit} style={{ flex: 1, padding: "8px", background: "#888", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  // NORMAL MODE
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#f5f5f5", borderRadius: 6 }}>
                    <div>
                      <strong>{pt.label}</strong> <span style={{ color: "#999" }}>RM{pt.min} – {pt.max === Infinity ? "∞" : "RM" + pt.max}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => editPriceTier(pt.label)} style={{ padding: "5px 10px", background: "#666", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️</button>
                      <button onClick={() => deletePriceTier(pt.label)} style={{ padding: "5px 10px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => setShowPriceTiers(false)} style={{ width: "100%", padding: "10px", background: "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 20 }}>Close</button>
          </div>
        </div>
      )}

      {showLeadTimes && isAdmin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 700, width: "90%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 20 }}>⏱️ Lead Times</h2>
            
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Add New</h3>
              <input type="text" value={newLeadTimeId} onChange={e => setNewLeadTimeId(e.target.value)} placeholder="ID (L5)" style={{ width: "100%", boxSizing: "border-box", padding: "10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, fontFamily: "inherit" }} />
              <input type="text" value={newLeadTimeLabel} onChange={e => setNewLeadTimeLabel(e.target.value)} placeholder="Label (Express)" style={{ width: "100%", boxSizing: "border-box", padding: "10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, fontFamily: "inherit" }} />
              <input type="text" value={newLeadTimeSub} onChange={e => setNewLeadTimeSub(e.target.value)} placeholder="Time (1–2 days)" style={{ width: "100%", boxSizing: "border-box", padding: "10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, fontFamily: "inherit" }} />
              <button onClick={addLeadTime} style={{ width: "100%", padding: "10px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 10 }}>Current</h3>
            {leadTimes.map(lt => (
              <div key={lt.id} style={{ marginBottom: 10 }}>
                {editingLeadTimeId === lt.id ? (
                  <div style={{ display: "grid", gap: 8, padding: 12, background: "#fffbf7", borderRadius: 6, border: "1px solid #c8a96e" }}>
                    <div>
                      <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>ID (locked)</label>
                      <div style={{ padding: "10px", fontSize: 13, background: "#eee", borderRadius: 4, color: "#666" }}>{lt.id}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Label</label>
                      <input type="text" value={editLeadLabel} onChange={e => setEditLeadLabel(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "8px", fontSize: 13, border: "1px solid #c8a96e", borderRadius: 4, fontFamily: "inherit" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Time</label>
                      <input type="text" value={editLeadSub} onChange={e => setEditLeadSub(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "8px", fontSize: 13, border: "1px solid #c8a96e", borderRadius: 4, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveLeadTimeEdit} style={{ flex: 1, padding: "8px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✓ Save</button>
                      <button onClick={cancelLeadTimeEdit} style={{ flex: 1, padding: "8px", background: "#888", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#f5f5f5", borderRadius: 6 }}>
                    <div>
                      <strong>{lt.label}</strong> <span style={{ color: "#999" }}>({lt.sub})</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => editLeadTime(lt.id)} style={{ padding: "5px 10px", background: "#666", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️</button>
                      <button onClick={() => deleteLeadTime(lt.id)} style={{ padding: "5px 10px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => setShowLeadTimes(false)} style={{ width: "100%", padding: "10px", background: "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 20 }}>Close</button>
          </div>
        </div>
      )}

      {showCategories && isAdmin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 700, width: "90%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 20 }}>📂 Categories</h2>
            
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Add New</h3>
              <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Category name" style={{ width: "100%", boxSizing: "border-box", padding: "10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, marginBottom: 8, fontFamily: "inherit" }} />
              <button onClick={addCategory} style={{ width: "100%", padding: "10px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 10 }}>Current</h3>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: 10 }}>
                {editingCategoryName === cat ? (
                  <div style={{ display: "flex", gap: 8, padding: 12, background: "#fffbf7", borderRadius: 6, border: "1px solid #c8a96e" }}>
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} style={{ flex: 1, padding: "8px", fontSize: 13, border: "1px solid #c8a96e", borderRadius: 4, fontFamily: "inherit" }} />
                    <button onClick={saveCategoryEdit} style={{ padding: "8px 12px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✓</button>
                    <button onClick={cancelCategoryEdit} style={{ padding: "8px 12px", background: "#888", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>×</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#f5f5f5", borderRadius: 6 }}>
                    <strong>{cat}</strong>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => editCategory(cat)} style={{ padding: "5px 10px", background: "#666", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✏️</button>
                      <button onClick={() => deleteCategory(cat)} style={{ padding: "5px 10px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => setShowCategories(false)} style={{ width: "100%", padding: "10px", background: "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 20 }}>Close</button>
          </div>
        </div>
      )}

      <div style={{ background: isAdmin ? "#8b5a1f" : "#1a1a1a", padding: "24px 32px", borderBottom: "3px solid #c8a96e" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#fff" }}>Product Catalog</h1>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: 12 }}>🔥 Firebase Database</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isAdmin && (
              <>
                <button onClick={() => setShowLeadTimes(!showLeadTimes)} style={{ padding: "10px 16px", background: "#666", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⏱️ Lead Times</button>
                <button onClick={() => setShowPriceTiers(!showPriceTiers)} style={{ padding: "10px 16px", background: "#666", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>💰 Price Tiers</button>
                <button onClick={() => setShowCategories(!showCategories)} style={{ padding: "10px 16px", background: "#666", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📂 Categories</button>
                <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Product</button>
              </>
            )}
            <button onClick={isAdmin ? handleAdminLogout : () => setShowAdminLogin(true)} style={{ padding: "10px 16px", background: isAdmin ? "#c8a96e" : "#666", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{isAdmin ? "🔒 Logout" : "🔓 Admin"}</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {showForm && isAdmin && (
          <div style={{ paddingTop: 32, paddingBottom: 40 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 32, border: "1.5px solid #e8e8e8" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 24 }}>{editingId ? "Edit Product" : "Add Product"}</h2>
              <form onSubmit={handleAddOrEditProduct} style={{ display: "grid", gap: 16 }}>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Product name" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, fontFamily: "inherit" }} />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Category" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, fontFamily: "inherit" }} />
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Price (RM)" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, fontFamily: "inherit" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <select value={formData.leadTime} onChange={e => setFormData({...formData, leadTime: e.target.value})} style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, fontFamily: "inherit" }}>
                    {leadTimes.map(lt => <option key={lt.id} value={lt.id}>{lt.label}</option>)}
                  </select>
                  <input type="number" value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} placeholder="MOQ" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, fontFamily: "inherit" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Image</label>
                  <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} style={{ border: dragActive ? "2px solid #c8a96e" : "2px dashed #ddd", borderRadius: 8, padding: "20px", textAlign: "center", background: dragActive ? "#f9f7f3" : "#fafafa", cursor: "pointer" }}>
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files?.[0])} style={{ display: "none" }} id="imageUploadInput" />
                    <label htmlFor="imageUploadInput" style={{ cursor: "pointer" }}>Drag or click</label>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Branding</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {BRANDING_OPTIONS.map(brand => (
                      <button key={brand} type="button" onClick={() => toggleBranding(brand)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: formData.branding.includes(brand) ? "1.5px solid #c8a96e" : "1px solid #ddd", background: formData.branding.includes(brand) ? "#c8a96e" : "#fff", color: formData.branding.includes(brand) ? "#fff" : "#444" }}>{brand}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={{ flex: 1, padding: "12px 24px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{editingId ? "Update" : "Add"}</button>
                  {editingId && <button type="button" onClick={resetForm} style={{ flex: 1, padding: "12px 24px", background: "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>}
                </div>
              </form>
            </div>
          </div>
        )}

        {!showForm && (
          <>
            <div style={{ paddingTop: 24, paddingBottom: 4 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ width: "100%", boxSizing: "border-box", padding: "11px 16px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8, background: "#fff" }} />
            </div>

            <div style={{ display: "flex", gap: 32, marginTop: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Category</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedCategory === cat ? "1.5px solid #1a1a1a" : "1.5px solid #ddd", background: selectedCategory === cat ? "#1a1a1a" : "#fff", color: selectedCategory === cat ? "#fff" : "#444" }}>{cat}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Price</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {priceTiers.map(tier => (
                    <button key={tier.label} onClick={() => setSelectedPrice(selectedPrice === tier.label ? null : tier.label)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedPrice === tier.label ? "1.5px solid #c8a96e" : "1.5px solid #ddd", background: selectedPrice === tier.label ? "#c8a96e" : "#fff", color: selectedPrice === tier.label ? "#fff" : "#444" }}>{tier.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Lead Time</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {leadTimes.map(lt => {
                    const c = LEAD_COLORS[lt.id] || { bg: "#f0f0f0", text: "#666", dot: "#999" };
                    const active = selectedLead === lt.id;
                    return (
                      <button key={lt.id} onClick={() => setSelectedLead(selectedLead === lt.id ? null : lt.id)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: active ? `1.5px solid ${c.dot}` : "1.5px solid #ddd", background: active ? c.bg : "#fff", color: active ? c.text : "#444" }}>{lt.sub}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selectedCategory && <span onClick={() => setSelectedCategory(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{selectedCategory} ×</span>}
                {selectedPrice && <span onClick={() => setSelectedPrice(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{selectedPrice} ×</span>}
                {selectedLead && <span onClick={() => setSelectedLead(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{leadTimes.find(lt => lt.id === selectedLead)?.sub} ×</span>}
                {(selectedCategory || selectedPrice || selectedLead) && <span onClick={clearAll} style={{ fontSize: 12, color: "#c8a96e", cursor: "pointer", fontWeight: 600 }}>Clear</span>}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}><strong>{filtered.length}</strong> products</div>
            </div>

            <div style={{ height: 1, background: "#e5e5e5", margin: "16px 0 24px" }} />

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div>No products found</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 40 }}>
                {filtered.map(p => {
                  const lc = LEAD_COLORS[p.leadTime] || { bg: "#f0f0f0", text: "#666", dot: "#999" };
                  return (
                    <div key={p.firestoreId} style={{ background: "#fff", borderRadius: 10, padding: "18px 20px", border: "1.5px solid #e8e8e8", overflow: "hidden" }}>
                      {p.image ? (
                        <div style={{ width: "calc(100% + 40px)", height: 180, marginLeft: -20, marginTop: -18, marginBottom: 14, background: "#f5f5f5", overflow: "hidden" }}>
                          <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ width: "calc(100% + 40px)", height: 180, marginLeft: -20, marginTop: -18, marginBottom: 14, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>📦</div>
                      )}
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 6 }}>{p.category}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>{p.name}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a" }}>RM{p.price}</span>
                        <span style={{ fontSize: 12, color: "#aaa" }}>/ unit</span>
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: lc.bg, color: lc.text, borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: lc.dot }} />
                        {p.leadLabel}
                      </div>
                      <div style={{ height: 1, background: "#f0f0f0", margin: "8px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#777", marginTop: 10, marginBottom: 12 }}>
                        <span>MOQ: <strong>{p.moq}</strong></span>
                        <span style={{ fontSize: 11 }}>{p.branding}</span>
                      </div>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEditProduct(p)} style={{ flex: 1, padding: "6px 8px", background: "#f0f0f0", color: "#1a1a1a", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</button>
                          <button onClick={() => deleteProduct(p.firestoreId)} style={{ flex: 1, padding: "6px 8px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑️ Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
