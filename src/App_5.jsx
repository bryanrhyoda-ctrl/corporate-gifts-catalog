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
  const [adminPanel, setAdminPanel] = useState(null); // "leadTimes", "priceTiers", "categories", "addProduct"

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
    setAdminPanel(null);
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
    setAdminPanel("addProduct");
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

  // EDIT FUNCTIONS
  const editPriceTier = (oldLabel) => {
    const pt = priceTiers.find(p => p.label === oldLabel);
    const newLabel = prompt("New label:", pt.label);
    if (newLabel === null) return;
    const newMin = prompt("New min:", pt.min.toString());
    if (newMin === null) return;
    const newMax = prompt("New max (or 'Infinity'):", pt.max === Infinity ? "Infinity" : pt.max.toString());
    if (newMax === null) return;
    
    const min = parseFloat(newMin);
    const max = newMax === "Infinity" ? Infinity : parseFloat(newMax);
    
    if (isNaN(min) || (max !== Infinity && isNaN(max))) {
      alert("Invalid numbers");
      return;
    }
    
    setPriceTiers(priceTiers.map(p => p.label === oldLabel ? { label: newLabel, min, max } : p));
    alert("✓ Updated!");
  };

  const deletePriceTier = (label) => {
    if (window.confirm("Delete this tier?")) {
      setPriceTiers(priceTiers.filter(p => p.label !== label));
      alert("✓ Deleted!");
    }
  };

  const editLeadTime = (id) => {
    const lt = leadTimes.find(l => l.id === id);
    const newLabel = prompt("New label:", lt.label);
    if (newLabel === null) return;
    const newSub = prompt("New time:", lt.sub);
    if (newSub === null) return;
    
    setLeadTimes(leadTimes.map(l => l.id === id ? { id, label: newLabel, sub: newSub } : l));
    alert("✓ Updated!");
  };

  const deleteLeadTime = (id) => {
    const productsUsing = products.filter(p => p.leadTime === id);
    if (productsUsing.length > 0) {
      alert(`Can't delete - ${productsUsing.length} products use this`);
      return;
    }
    if (window.confirm("Delete this lead time?")) {
      setLeadTimes(leadTimes.filter(lt => lt.id !== id));
      alert("✓ Deleted!");
    }
  };

  const editCategory = (oldName) => {
    const newName = prompt("New name:", oldName);
    if (newName === null) return;
    if (categoryList.includes(newName) && newName !== oldName) {
      alert("Already exists!");
      return;
    }
    setCategoryList(categoryList.map(c => c === oldName ? newName : c));
    setProducts(products.map(p => p.category === oldName ? { ...p, category: newName } : p));
    alert("✓ Updated!");
  };

  const deleteCategory = (name) => {
    const productsUsing = products.filter(p => p.category === name);
    if (productsUsing.length > 0) {
      alert(`Can't delete - ${productsUsing.length} products use this`);
      return;
    }
    if (window.confirm("Delete this category?")) {
      setCategoryList(categoryList.filter(c => c !== name));
      alert("✓ Deleted!");
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 20px" }}>Loading...</div>;
  }

  // ADMIN PANELS
  if (isAdmin && adminPanel === "leadTimes") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: "#fff", padding: 40, borderRadius: 12, border: "2px solid #c8a96e" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: "#1a1a1a" }}>⏱️ EDIT LEAD TIMES</h1>
            {leadTimes.map(lt => (
              <div key={lt.id} style={{ padding: 16, background: "#f5f5f5", borderRadius: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{lt.label}</div>
                  <div style={{ fontSize: 13, color: "#666" }}>{lt.sub}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editLeadTime(lt.id)} style={{ padding: "8px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>EDIT</button>
                  <button onClick={() => deleteLeadTime(lt.id)} style={{ padding: "8px 16px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin && adminPanel === "priceTiers") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: "#fff", padding: 40, borderRadius: 12, border: "2px solid #c8a96e" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: "#1a1a1a" }}>💰 EDIT PRICE TIERS</h1>
            {priceTiers.map(pt => (
              <div key={pt.label} style={{ padding: 16, background: "#f5f5f5", borderRadius: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{pt.label}</div>
                  <div style={{ fontSize: 13, color: "#666" }}>RM{pt.min} – {pt.max === Infinity ? "∞" : "RM" + pt.max}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editPriceTier(pt.label)} style={{ padding: "8px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>EDIT</button>
                  <button onClick={() => deletePriceTier(pt.label)} style={{ padding: "8px 16px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin && adminPanel === "categories") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: "#fff", padding: 40, borderRadius: 12, border: "2px solid #c8a96e" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: "#1a1a1a" }}>📂 EDIT CATEGORIES</h1>
            {categories.map(cat => (
              <div key={cat} style={{ padding: 16, background: "#f5f5f5", borderRadius: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{cat}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editCategory(cat)} style={{ padding: "8px 16px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>EDIT</button>
                  <button onClick={() => deleteCategory(cat)} style={{ padding: "8px 16px", background: "#ff5555", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin && adminPanel === "addProduct") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: "#fff", padding: 40, borderRadius: 12, border: "2px solid #c8a96e" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: "#1a1a1a" }}>{editingId ? "EDIT PRODUCT" : "ADD PRODUCT"}</h1>
            <form onSubmit={handleAddOrEditProduct} style={{ display: "grid", gap: 20 }}>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Product name" style={{ padding: "12px 16px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8, fontFamily: "inherit" }} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Category" style={{ padding: "12px 16px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8, fontFamily: "inherit" }} />
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Price (RM)" style={{ padding: "12px 16px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8, fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <select value={formData.leadTime} onChange={e => setFormData({...formData, leadTime: e.target.value})} style={{ padding: "12px 16px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8, fontFamily: "inherit" }}>
                  {leadTimes.map(lt => <option key={lt.id} value={lt.id}>{lt.label}</option>)}
                </select>
                <input type="number" value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} placeholder="MOQ" style={{ padding: "12px 16px", fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8, fontFamily: "inherit" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Image</label>
                <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} style={{ border: dragActive ? "2px solid #c8a96e" : "2px dashed #ddd", borderRadius: 8, padding: "30px", textAlign: "center", background: dragActive ? "#f9f7f3" : "#fafafa", cursor: "pointer" }}>
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files?.[0])} style={{ display: "none" }} id="imageUploadInput" />
                  <label htmlFor="imageUploadInput" style={{ cursor: "pointer", fontSize: 14 }}>Drag or click to upload</label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 10 }}>Branding</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BRANDING_OPTIONS.map(brand => (
                    <button key={brand} type="button" onClick={() => toggleBranding(brand)} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: formData.branding.includes(brand) ? "1.5px solid #c8a96e" : "1px solid #ddd", background: formData.branding.includes(brand) ? "#c8a96e" : "#fff", color: formData.branding.includes(brand) ? "#fff" : "#444" }}>{brand}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" style={{ flex: 1, padding: "14px 24px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{editingId ? "UPDATE" : "ADD"}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); resetForm(); }} style={{ flex: 1, padding: "14px 24px", background: "#888", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>CANCEL</button>}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN MENU
  if (isAdmin && !adminPanel) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 40, color: "#1a1a1a", textAlign: "center" }}>⚙️ ADMIN PANEL</h1>
          <button onClick={handleAdminLogout} style={{ width: "100%", marginBottom: 20, padding: "12px 20px", background: "#666", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>🔒 Logout</button>
          
          <button onClick={() => setAdminPanel("leadTimes")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: "#fff", border: "2px solid #c8a96e", borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>⏱️ EDIT LEAD TIMES</button>
          
          <button onClick={() => setAdminPanel("priceTiers")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: "#fff", border: "2px solid #c8a96e", borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>💰 EDIT PRICE TIERS</button>
          
          <button onClick={() => setAdminPanel("categories")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: "#fff", border: "2px solid #c8a96e", borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>📂 EDIT CATEGORIES</button>
          
          <button onClick={() => setAdminPanel("addProduct")} style={{ width: "100%", padding: "20px", background: "#c8a96e", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#fff" }}>✨ ADD PRODUCT</button>
        </div>
      </div>
    );
  }

  // CATALOG VIEW (Normal users + admin not in panel)
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

      <div style={{ background: isAdmin ? "#8b5a1f" : "#1a1a1a", padding: "24px 32px", borderBottom: "3px solid #c8a96e" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#fff" }}>Product Catalog</h1>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: 12 }}>🔥 Firebase Database</p>
          </div>
          <div>
            {isAdmin ? (
              <button onClick={() => setAdminPanel(null)} style={{ padding: "10px 20px", background: "#c8a96e", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⚙️ ADMIN</button>
            ) : (
              <button onClick={() => setShowAdminLogin(true)} style={{ padding: "10px 20px", background: "#666", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔓 Admin</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
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
      </div>
    </div>
  );
}
