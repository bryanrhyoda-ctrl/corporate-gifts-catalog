import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

// ===== FIREBASE CONFIG =====
// REPLACE THESE WITH YOUR OWN FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBNUhJDS5omotKq2c9ueb0p6MRUmktSZB8",
  authDomain: "corporate-gifts-catalog.firebaseapp.com",
  projectId: "corporate-gifts-catalog",
  storageBucket: "corporate-gifts-catalog.firebasestorage.app",
  messagingSenderId: "363640826064",
  appId: "1:363640826064:web:bcf1ff57345bea316ed6d5"
};
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== CONSTANTS =====
const DEFAULT_LEAD_TIMES = [
  { id: "L1", label: "L1 — Ready Stock", sub: "1–3 days" },
  { id: "L2", label: "L2 — Local Prod",  sub: "5–7 days" },
  { id: "L3", label: "L3 — Import",      sub: "2–3 weeks" },
  { id: "L4", label: "L4 — Custom",      sub: "4–6 weeks" },
];

const PRICE_TIERS = [
  { label: "Below RM5",    min: 0,   max: 5   },
  { label: "RM5 – RM15",   min: 5,   max: 15  },
  { label: "RM15 – RM50",  min: 15,  max: 50  },
  { label: "RM50 – RM150", min: 50,  max: 150 },
  { label: "Above RM150",  min: 150, max: Infinity },
];

const BRANDING_OPTIONS = ["Silkscreen", "Laser", "Emboss", "Deboss", "Print", "Full Print", "Custom Box", "Heat Transfer"];

const LEAD_COLORS = {
  L1: { bg: "#dcfce7", text: "#15803d", dot: "#16a34a" },
  L2: { bg: "#dbeafe", text: "#1d4ed8", dot: "#2563eb" },
  L3: { bg: "#fef9c3", text: "#a16207", dot: "#ca8a04" },
  L4: { bg: "#fee2e2", text: "#b91c1c", dot: "#dc2626" },
};

const ADMIN_PASSWORD = "admin123";

// ===== MAIN COMPONENT =====
export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [leadTimes, setLeadTimes] = useState(() => {
    const saved = localStorage.getItem('catalogLeadTimes');
    return saved ? JSON.parse(saved) : DEFAULT_LEAD_TIMES;
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
  
  const [newLeadTimeId, setNewLeadTimeId] = useState("");
  const [newLeadTimeLabel, setNewLeadTimeLabel] = useState("");
  const [newLeadTimeSub, setNewLeadTimeSub] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "Electronic",
    price: "",
    leadTime: "L2",
    moq: "",
    image: "",
    branding: [],
  });

  // ===== FIRESTORE LISTENER =====
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsArray = [];
      querySnapshot.forEach((doc) => {
        productsArray.push({ 
          firestoreId: doc.id, 
          ...doc.data() 
        });
      });
      setProducts(productsArray);
      setLoading(false);
    }, (error) => {
      console.error("Error loading products:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ===== LOCAL STORAGE SYNC =====
  useEffect(() => {
    localStorage.setItem('catalogLeadTimes', JSON.stringify(leadTimes));
  }, [leadTimes]);

  useEffect(() => {
    localStorage.setItem('catalogCategories', JSON.stringify(categoryList));
  }, [categoryList]);

  const categories = categoryList.sort();

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (selectedPrice) {
        const tier = PRICE_TIERS.find(t => t.label === selectedPrice);
        if (p.price < tier.min || p.price >= tier.max) return false;
      }
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedLead && p.leadTime !== selectedLead) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, selectedPrice, selectedCategory, selectedLead, search]);

  const clearAll = () => {
    setSelectedPrice(null);
    setSelectedCategory(null);
    setSelectedLead(null);
    setSearch("");
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword("");
      alert("✓ Admin mode activated");
    } else {
      alert("❌ Incorrect password");
      setAdminPassword("");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setShowForm(false);
    setShowLeadTimes(false);
    setShowCategories(false);
    setEditingId(null);
  };

  // ===== ADD/UPDATE PRODUCT TO FIRESTORE =====
  const handleAddOrEditProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.moq || formData.branding.length === 0) {
      alert("Please fill in all required fields");
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
        const productRef = doc(db, "products", editingId);
        await updateDoc(productRef, productData);
        alert("✓ Product updated");
      } else {
        await addDoc(collection(db, "products"), productData);
        alert("✓ Product added to database");
      }
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("❌ Error saving product. Check Firebase config.");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", category: "Electronic", price: "", leadTime: "L2", moq: "", image: "", branding: [] });
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

  // ===== DELETE PRODUCT FROM FIRESTORE =====
  const deleteProduct = async (firestoreId) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this product?")) return;
    
    try {
      await deleteDoc(doc(db, "products", firestoreId));
      alert("✓ Product deleted");
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("❌ Error deleting product");
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
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const addLeadTime = () => {
    if (!newLeadTimeId.trim() || !newLeadTimeLabel.trim()) {
      alert("Please fill in ID and label");
      return;
    }
    if (leadTimes.find(lt => lt.id === newLeadTimeId)) {
      alert("This lead time ID already exists");
      return;
    }
    const updated = [...leadTimes, { id: newLeadTimeId, label: newLeadTimeLabel, sub: newLeadTimeSub }];
    setLeadTimes(updated);
    setNewLeadTimeId("");
    setNewLeadTimeLabel("");
    setNewLeadTimeSub("");
    alert("✓ Lead time added!");
  };

  const deleteLeadTime = (id) => {
    const productsUsing = products.filter(p => p.leadTime === id);
    if (productsUsing.length > 0) {
      alert(`Cannot delete - ${productsUsing.length} product(s) using this lead time`);
      return;
    }
    setLeadTimes(leadTimes.filter(lt => lt.id !== id));
    alert("✓ Lead time deleted!");
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) {
      alert("Please enter category name");
      return;
    }
    if (categoryList.includes(newCategoryName)) {
      alert("Category already exists");
      return;
    }
    setCategoryList([...categoryList, newCategoryName]);
    setNewCategoryName("");
    alert("✓ Category '" + newCategoryName + "' added!");
  };

  // ===== RENDER =====
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "0 0 60px" }}>
      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14, color: "#666" }}>Loading from Firebase...</div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Admin Login</h2>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Enter password</p>
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleAdminLogin()}
              placeholder="Password"
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, marginBottom: 16, fontFamily: "inherit" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAdminLogin} style={{ flex: 1, padding: "10px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Login</button>
              <button onClick={() => { setShowAdminLogin(false); setAdminPassword(""); }} style={{ flex: 1, padding: "10px 16px", background: "#ddd", color: "#1a1a1a", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showLeadTimes && isAdmin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 600, width: "90%", maxHeight: "80vh", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>⏱️ Manage Lead Times</h2>
            
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Add New Lead Time</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <input type="text" value={newLeadTimeId} onChange={e => setNewLeadTimeId(e.target.value)} placeholder="e.g., L5" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", fontFamily: "inherit" }} />
                <input type="text" value={newLeadTimeLabel} onChange={e => setNewLeadTimeLabel(e.target.value)} placeholder="e.g., L5 — Express" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", fontFamily: "inherit" }} />
                <input type="text" value={newLeadTimeSub} onChange={e => setNewLeadTimeSub(e.target.value)} placeholder="e.g., 1–2 days" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", fontFamily: "inherit" }} />
                <button onClick={addLeadTime} style={{ padding: "10px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add Lead Time</button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Existing Lead Times</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {leadTimes.map(lt => (
                  <div key={lt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#f5f5f5", borderRadius: 6 }}>
                    <div><div style={{ fontWeight: 600, color: "#1a1a1a" }}>{lt.label}</div><div style={{ fontSize: 12, color: "#999" }}>{lt.sub}</div></div>
                    <button onClick={() => deleteLeadTime(lt.id)} style={{ padding: "6px 12px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setShowLeadTimes(false)} style={{ width: "100%", padding: "10px 16px", background: "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      )}

      {showCategories && isAdmin && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 600, width: "90%", maxHeight: "80vh", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>📂 Manage Categories</h2>
            
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Add New Category</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g., Apparel" style={{ padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", fontFamily: "inherit" }} />
                <button onClick={addCategory} style={{ padding: "10px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add Category</button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Existing Categories</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map(cat => (
                  <span key={cat} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f5f5f5", color: "#1a1a1a", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 500 }}>{cat}</span>
                ))}
              </div>
            </div>

            <button onClick={() => setShowCategories(false)} style={{ width: "100%", padding: "10px 16px", background: "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
          </div>
        </div>
      )}

      <div style={{ background: isAdmin ? "#8b5a1f" : "#1a1a1a", padding: "28px 32px 24px", borderBottom: "3px solid #c8a96e" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "#c8a96e", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Corporate Gifts Agency {isAdmin && "— ADMIN MODE"}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.5px" }}>Product Catalog</h1>
              <p style={{ margin: "6px 0 0", color: "#9a9a9a", fontSize: 13 }}>🔥 Live Firebase Database {isAdmin && "• Admin mode: Full control"}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isAdmin ? (
                <>
                  <button onClick={() => { setShowLeadTimes(!showLeadTimes); setShowCategories(false); setShowForm(false); }} style={{ padding: "10px 16px", background: showLeadTimes ? "#555" : "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>⏱️ Lead Times</button>
                  <button onClick={() => { setShowCategories(!showCategories); setShowLeadTimes(false); setShowForm(false); }} style={{ padding: "10px 16px", background: showCategories ? "#555" : "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>📂 Categories</button>
                  <button onClick={() => { setShowForm(!showForm); setShowLeadTimes(false); setShowCategories(false); }} style={{ padding: "10px 20px", background: showForm ? "#555" : "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add Product</button>
                </>
              ) : null}
              <button onClick={isAdmin ? handleAdminLogout : () => setShowAdminLogin(true)} style={{ padding: "10px 16px", background: isAdmin ? "#c8a96e" : "#666", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{isAdmin ? "🔒 Logout" : "🔓 Admin"}</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {showForm && isAdmin ? (
          <div style={{ paddingTop: 32, paddingBottom: 40 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 32, border: "1.5px solid #e8e8e8" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 24 }}>{editingId ? "Edit Product" : "Add New Product"}</h2>
              <form onSubmit={handleAddOrEditProduct} style={{ display: "grid", gap: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, textTransform: "uppercase" }}>Product Name *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., USB Power Bank" style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", outline: "none", color: "#1a1a1a", fontFamily: "inherit" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, textTransform: "uppercase" }}>Category *</label>
                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g., Electronic" style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", outline: "none", color: "#1a1a1a", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#c8a96e", marginBottom: 6, textTransform: "uppercase", fontStyle: "italic" }}>Price (RM) *</label>
                    <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0" style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: 14, border: "2px solid #c8a96e", borderRadius: 6, background: "#fffbf7", outline: "none", color: "#1a1a1a", fontFamily: "inherit" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#c8a96e", marginBottom: 6, textTransform: "uppercase", fontStyle: "italic" }}>Lead Time *</label>
                    <select value={formData.leadTime} onChange={e => setFormData({...formData, leadTime: e.target.value})} style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: 14, border: "2px solid #c8a96e", borderRadius: 6, background: "#fffbf7", outline: "none", color: "#1a1a1a", fontFamily: "inherit" }}>
                      {leadTimes.map(lt => <option key={lt.id} value={lt.id}>{lt.label} • {lt.sub}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, textTransform: "uppercase" }}>MOQ (Pieces) *</label>
                    <input type="number" value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} placeholder="0" style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", outline: "none", color: "#1a1a1a", fontFamily: "inherit" }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 10, textTransform: "uppercase" }}>Product Image</label>
                  <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} style={{ border: dragActive ? "2px solid #c8a96e" : "2px dashed #ddd", borderRadius: 8, padding: "32px", textAlign: "center", background: dragActive ? "#f9f7f3" : "#fafafa", cursor: "pointer" }}>
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files?.[0])} style={{ display: "none" }} id="imageUploadInput" />
                    <label htmlFor="imageUploadInput" style={{ cursor: "pointer" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Drag & drop image or click</div>
                    </label>
                  </div>
                </div>

                {formData.image && <div><div style={{ width: 120, height: 120, borderRadius: 8, overflow: "hidden", background: "#f5f5f5" }}><img src={formData.image} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div></div>}

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 10, textTransform: "uppercase" }}>Branding Options * (Select at least one)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {BRANDING_OPTIONS.map(brand => (
                      <button key={brand} type="button" onClick={() => toggleBranding(brand)} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: formData.branding.includes(brand) ? "1.5px solid #c8a96e" : "1.5px solid #ddd", background: formData.branding.includes(brand) ? "#c8a96e" : "#fff", color: formData.branding.includes(brand) ? "#fff" : "#444", transition: "all 0.15s", fontFamily: "inherit" }}>{brand}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={{ flex: 1, padding: "12px 24px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{editingId ? "Update Product" : "Add Product"}</button>
                  {editingId && <button type="button" onClick={resetForm} style={{ padding: "12px 24px", background: "#888", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>}
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
            <div style={{ paddingTop: 28, paddingBottom: 4 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name or category..." style={{ width: "100%", boxSizing: "border-box", padding: "11px 16px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8, background: "#fff", outline: "none", color: "#1a1a1a", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }} />
            </div>

            <div style={{ display: "flex", gap: 32, marginTop: 24, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Category</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: "pointer", border: selectedCategory === cat ? "1.5px solid #1a1a1a" : "1.5px solid #ddd", background: selectedCategory === cat ? "#1a1a1a" : "#fff", color: selectedCategory === cat ? "#fff" : "#444", transition: "all 0.15s" }}>{cat}</button>
                  ))}
                </div>
              </div>

              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Price per Unit</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PRICE_TIERS.map(tier => (
                    <button key={tier.label} onClick={() => setSelectedPrice(selectedPrice === tier.label ? null : tier.label)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: "pointer", border: selectedPrice === tier.label ? "1.5px solid #c8a96e" : "1.5px solid #ddd", background: selectedPrice === tier.label ? "#c8a96e" : "#fff", color: selectedPrice === tier.label ? "#fff" : "#444", transition: "all 0.15s" }}>{tier.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Lead Time</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {leadTimes.map(lt => {
                    const c = LEAD_COLORS[lt.id] || { bg: "#f0f0f0", text: "#666", dot: "#999" };
                    const active = selectedLead === lt.id;
                    return (
                      <button key={lt.id} onClick={() => setSelectedLead(selectedLead === lt.id ? null : lt.id)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: "pointer", border: active ? `1.5px solid ${c.dot}` : "1.5px solid #ddd", background: active ? c.bg : "#fff", color: active ? c.text : "#444", transition: "all 0.15s" }}>{lt.sub}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {selectedCategory && <span onClick={() => setSelectedCategory(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "4px 11px 4px 13px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{selectedCategory} <span style={{ fontSize: 14, opacity: 0.7 }}>×</span></span>}
                {selectedPrice && <span onClick={() => setSelectedPrice(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "4px 11px 4px 13px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{selectedPrice} <span style={{ fontSize: 14, opacity: 0.7 }}>×</span></span>}
                {selectedLead && <span onClick={() => setSelectedLead(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "4px 11px 4px 13px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{leadTimes.find(lt => lt.id === selectedLead)?.sub} <span style={{ fontSize: 14, opacity: 0.7 }}>×</span></span>}
                {(selectedCategory || selectedPrice || selectedLead) && <span onClick={clearAll} style={{ fontSize: 12, color: "#c8a96e", cursor: "pointer", fontWeight: 600 }}>Clear all</span>}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}><span style={{ fontWeight: 700, color: "#1a1a1a" }}>{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""}</div>
            </div>

            <div style={{ height: 1, background: "#e5e5e5", margin: "16px 0 24px" }} />

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#555" }}>No products match your filters</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 40 }}>
                {filtered.map(p => {
                  const lc = LEAD_COLORS[p.leadTime] || { bg: "#f0f0f0", text: "#666", dot: "#999" };
                  return (
                    <div key={p.firestoreId} style={{ background: "#fff", borderRadius: 10, padding: "18px 20px", border: "1.5px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                      {p.image ? (
                        <div style={{ width: "calc(100% + 40px)", height: 180, marginLeft: -20, marginTop: -18, marginBottom: 14, background: "#f5f5f5", overflow: "hidden" }}>
                          <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ width: "calc(100% + 40px)", height: 180, marginLeft: -20, marginTop: -18, marginBottom: 14, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#ddd", fontSize: 40 }}>📦</div>
                      )}
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 5 }}>{p.category}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 14, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a" }}>RM{p.price}</span>
                        <span style={{ fontSize: 12, color: "#aaa" }}>/ unit</span>
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: lc.bg, color: lc.text, borderRadius: 6, padding: "4px 9px", fontSize: 11.5, fontWeight: 600, marginBottom: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: lc.dot, display: "inline-block" }} />
                        {p.leadLabel}
                      </div>
                      <div style={{ height: 1, background: "#f0f0f0", margin: "2px 0 12px" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#777", marginBottom: 12 }}>
                        <span>MOQ: <strong>{p.moq} pcs</strong></span>
                        <span style={{ textAlign: "right", maxWidth: "50%", fontSize: 11 }}>{p.branding}</span>
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
