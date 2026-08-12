import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { COLORS, DEFAULTS, OPTIONS } from "./constants";

// Passwords (kept in component for security - not exported)
const PASSWORDS = {
  catalog: "PANTONE",
  admin: "admin123",
};



export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMode, setUserMode] = useState("splash");
  const [leadTimes, setLeadTimes] = useState([]);
  const [priceTiers, setPriceTiers] = useState([]);
  const [categoryList, setCategoryList] = useState([]);

  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [password, setPassword] = useState("");
  const [adminPanel, setAdminPanel] = useState(null);
  const [manageProductSearch, setManageProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    link: "",
    size: "",
    material: "",
    leadTime: "L1",
    moq: "",
    image: "",
    printing: [],
    pricingTiers: [],
  });

  const [newTierMoq, setNewTierMoq] = useState("");
  const [newTierPrice, setNewTierPrice] = useState("");

  // FIREBASE LISTENERS
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const productsArray = [];
        querySnapshot.forEach((doc) => {
          productsArray.push({ firestoreId: doc.id, ...doc.data() });
        });
        setProducts(productsArray);
        setLoading(false);
      },
      (error) => {
        console.error("Firebase error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("Setting up leadTimes listener...");
    const unsubscribe = onSnapshot(
      doc(db, "settings", "leadTimes"),
      (docSnap) => {
        console.log("leadTimes snapshot received:", docSnap.data());
        if (docSnap.exists()) {
          setLeadTimes(docSnap.data().items || DEFAULTS.leadTimes);
        } else {
          console.log("leadTimes document doesn't exist, using defaults");
          setLeadTimes(DEFAULTS.leadTimes);
        }
      },
      (error) => {
        console.error("❌ Lead times listener error:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("Setting up priceTiers listener...");
    const unsubscribe = onSnapshot(
      doc(db, "settings", "priceTiers"),
      (docSnap) => {
        console.log("priceTiers snapshot received:", docSnap.data());
        if (docSnap.exists()) {
          setPriceTiers(docSnap.data().items || DEFAULTS.priceTiers);
        } else {
          console.log("priceTiers document doesn't exist, using defaults");
          setPriceTiers(DEFAULTS.priceTiers);
        }
      },
      (error) => {
        console.error("❌ Price tiers listener error:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("Setting up categories listener...");
    const unsubscribe = onSnapshot(
      doc(db, "settings", "categories"),
      (docSnap) => {
        console.log("categories snapshot received:", docSnap.data());
        if (docSnap.exists()) {
          setCategoryList(docSnap.data().items || ["Electronic", "Bottle", "Stationery"]);
        } else {
          console.log("categories document doesn't exist, using defaults");
          setCategoryList(["Electronic", "Bottle", "Stationery"]);
        }
      },
      (error) => {
        console.error("❌ Categories listener error:", error);
      }
    );
    return () => unsubscribe();
  }, []);

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

  const filteredManageProducts = useMemo(() => {
    if (!manageProductSearch.trim()) return products;
    const q = manageProductSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, manageProductSearch]);

  const clearAll = () => {
    setSelectedPrice(null);
    setSelectedCategory(null);
    setSelectedLead(null);
    setSearch("");
  };

  const handleCatalogLogin = () => {
    if (password === PASSWORDS.catalog) {
      setUserMode("catalogView");
      setPassword("");
    } else {
      alert("❌ Incorrect password");
      setPassword("");
    }
  };

  const handleAdminLogin = () => {
    if (password === PASSWORDS.admin) {
      setUserMode("adminPanel");
      setPassword("");
    } else {
      alert("❌ Incorrect password");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setUserMode("splash");
    setAdminPanel(null);
    setPassword("");
    setEditingId(null);
  };

  const handleAddOrEditProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.moq || formData.printing.length === 0 || !formData.category) {
      alert("Fill all required fields!");
      return;
    }

    const productData = {
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      link: formData.link,
      size: formData.size,
      material: formData.material,
      leadTime: formData.leadTime,
      leadLabel: leadTimes.find(lt => lt.id === formData.leadTime)?.sub,
      moq: parseInt(formData.moq),
      image: formData.image,
      printing: formData.printing.join(", "),
      pricingTiers: formData.pricingTiers || [],
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
    setFormData({
      name: "",
      category: "",
      price: "",
      link: "",
      size: "",
      material: "",
      leadTime: "L1",
      moq: "",
      image: "",
      printing: [],
      pricingTiers: [],
    });
    setEditingId(null);
    setNewTierMoq("");
    setNewTierPrice("");
  };

  const startEditProduct = (product) => {
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      link: product.link || "",
      size: product.size || "",
      material: product.material || "",
      leadTime: product.leadTime,
      moq: product.moq.toString(),
      image: product.image,
      printing: product.printing ? product.printing.split(", ").map(b => b.trim()) : [],
      pricingTiers: product.pricingTiers || [],
    });
    setEditingId(product.firestoreId);
    setAdminPanel("addProduct");
  };

  const deleteProduct = async (firestoreId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", firestoreId));
      alert("✓ Deleted!");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const togglePrinting = (option) => {
    setFormData(prev => ({
      ...prev,
      printing: prev.printing.includes(option)
        ? prev.printing.filter(p => p !== option)
        : [...prev.printing, option]
    }));
  };

  const addPricingTier = () => {
    if (!newTierMoq || !newTierPrice) {
      alert("Fill MOQ and Price");
      return;
    }
    const moq = parseInt(newTierMoq);
    const price = parseFloat(newTierPrice);
    if (isNaN(moq) || isNaN(price)) {
      alert("Invalid numbers");
      return;
    }
    setFormData(prev => ({
      ...prev,
      pricingTiers: [...prev.pricingTiers, { moq, price }].sort((a, b) => a.moq - b.moq)
    }));
    setNewTierMoq("");
    setNewTierPrice("");
  };

  const removePricingTier = (index) => {
    setFormData(prev => ({
      ...prev,
      pricingTiers: prev.pricingTiers.filter((_, i) => i !== index)
    }));
  };

  const exportToCSV = () => {
    if (products.length === 0) {
      alert("No products to export!");
      return;
    }

    const headers = ["Name", "Category", "Base Price", "Size", "Material", "Lead Time", "MOQ", "Link", "Printing"];
    const rows = products.map(p => [
      p.name,
      p.category,
      p.price,
      p.size || "",
      p.material || "",
      p.leadLabel || p.leadTime,
      p.moq,
      p.link || "",
      p.printing || ""
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  const addCategory = () => {
    const newName = prompt("New category name:");
    if (newName === null) return;
    if (categoryList.includes(newName)) {
      alert("Already exists!");
      return;
    }
    const updated = [...categoryList, newName];
    setCategoryList(updated);
    setDoc(doc(db, "settings", "categories"), { items: updated }, { merge: true });
    alert("✓ Added!");
  };

  const editCategory = (oldName) => {
    const newName = prompt("New name:", oldName);
    if (newName === null) return;
    if (categoryList.includes(newName) && newName !== oldName) {
      alert("Already exists!");
      return;
    }
    const updated = categoryList.map(c => c === oldName ? newName : c);
    setCategoryList(updated);
    setDoc(doc(db, "settings", "categories"), { items: updated }, { merge: true });
    alert("✓ Updated!");
  };

  const deleteCategory = (name) => {
    const productsUsing = products.filter(p => p.category === name);
    if (productsUsing.length > 0) {
      alert(`Can't delete - ${productsUsing.length} products use this`);
      return;
    }
    if (window.confirm("Delete this category?")) {
      const updated = categoryList.filter(c => c !== name);
      setCategoryList(updated);
      setDoc(doc(db, "settings", "categories"), { items: updated }, { merge: true });
      alert("✓ Deleted!");
    }
  };

  const addLeadTime = () => {
    const newLabel = prompt("New lead time label (e.g., 'Ready Stock'):");
    if (newLabel === null) return;
    const newSub = prompt("Time description (e.g., '1–3 days'):");
    if (newSub === null) return;
    
    const newId = "L" + (leadTimes.length + 1);
    const updated = [...leadTimes, { id: newId, label: newLabel, sub: newSub }];
    setLeadTimes(updated);
    setDoc(doc(db, "settings", "leadTimes"), { items: updated }, { merge: true });
    alert("✓ Added!");
  };

  const editLeadTime = (id) => {
    const lt = leadTimes.find(l => l.id === id);
    const newLabel = prompt("New label:", lt.label);
    if (newLabel === null) return;
    const newSub = prompt("New time:", lt.sub);
    if (newSub === null) return;
    
    const updated = leadTimes.map(l => l.id === id ? { id, label: newLabel, sub: newSub } : l);
    setLeadTimes(updated);
    setDoc(doc(db, "settings", "leadTimes"), { items: updated }, { merge: true });
    alert("✓ Updated!");
  };

  const deleteLeadTime = (id) => {
    const productsUsing = products.filter(p => p.leadTime === id);
    if (productsUsing.length > 0) {
      alert(`Can't delete - ${productsUsing.length} products use this`);
      return;
    }
    if (window.confirm("Delete this lead time?")) {
      const updated = leadTimes.filter(lt => lt.id !== id);
      setLeadTimes(updated);
      setDoc(doc(db, "settings", "leadTimes"), { items: updated }, { merge: true });
      alert("✓ Deleted!");
    }
  };

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
    
    const updated = priceTiers.map(p => p.label === oldLabel ? { label: newLabel, min, max } : p);
    setPriceTiers(updated);
    setDoc(doc(db, "settings", "priceTiers"), { items: updated }, { merge: true });
    alert("✓ Updated!");
  };

  const deletePriceTier = (label) => {
    if (window.confirm("Delete this tier?")) {
      const updated = priceTiers.filter(p => p.label !== label);
      setPriceTiers(updated);
      setDoc(doc(db, "settings", "priceTiers"), { items: updated }, { merge: true });
      alert("✓ Deleted!");
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: "'Inter', system-ui, sans-serif" }}>Loading from Firebase...</div>;
  }

  // PRODUCT DETAIL SIDE PANEL
  const ProductDetailPanel = ({ product, onClose }) => {
    if (!product) return null;
    const lc = OPTIONS.leadColors[product.leadTime] || { bg: COLORS.light, text: COLORS.gray, badge: COLORS.gray };
    
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }} />
        <div style={{ position: "fixed", top: 0, right: 0, width: "100%", maxWidth: "420px", height: "100vh", background: COLORS.white, boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", zIndex: 999, overflow: "auto" }}>
          <div style={{ padding: "20px", borderBottom: `2px solid ${COLORS.light}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: COLORS.white }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.text }}>Product Details</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: COLORS.gray, padding: 0, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          <div style={{ padding: "20px" }}>
            {product.image && (
              <div style={{ width: "100%", height: 280, background: COLORS.light, borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
                <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase", marginBottom: 6 }}>{product.category}</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: COLORS.text }}>{product.name}</h3>
              {product.size && <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 6 }}>Size: {product.size}</div>}
              {product.material && <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 12 }}>Material: {product.material}</div>}
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: lc.bg, color: lc.text, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: lc.badge }} />
              {product.leadLabel}
            </div>

            <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 600, marginBottom: 8 }}>PRICE</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary }}>RM{parseFloat(product.price).toFixed(2)}</div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>per unit</div>
            </div>

            <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 600, marginBottom: 8 }}>MINIMUM ORDER QUANTITY</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.purple }}>{product.moq}</div>
            </div>

            {product.pricingTiers && product.pricingTiers.length > 0 && (
              <div style={{ padding: 16, background: COLORS.light, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 600, marginBottom: 12 }}>💰 TIERED PRICING</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {product.pricingTiers.map((tier, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e0e0e0" }}>
                      <span style={{ fontSize: 12, color: COLORS.gray }}>MOQ {tier.moq}+</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary }}>RM{parseFloat(tier.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.printing && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 600, marginBottom: 10 }}>PRINTING OPTIONS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {product.printing.split(",").map((option, idx) => (
                    <span key={idx} style={{ padding: "6px 10px", background: COLORS.primary, color: COLORS.darkBlue, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{option.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {product.link && (
              <a href={product.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "12px 16px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "center", textDecoration: "none", marginBottom: 12 }}>View Website →</a>
            )}

            <button onClick={onClose} style={{ width: "100%", padding: "12px 16px", background: COLORS.light, color: COLORS.text, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      </>
    );
  };

  // SPLASH SCREEN
  if (userMode === "splash") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.darkBlue, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🎁</div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>Product Catalog</h1>
          <p style={{ fontSize: 16, color: COLORS.light, marginBottom: 40 }}>Corporate Gifts Agency</p>
          
          <button onClick={() => setUserMode("catalogLogin")} style={{ width: "100%", padding: "16px 24px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>👁️ View Catalog</button>
          
          <button onClick={() => setUserMode("adminLogin")} style={{ width: "100%", padding: "16px 24px", background: COLORS.purple, color: COLORS.white, border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>🔓 Admin</button>
        </div>
      </div>
    );
  }

  // CATALOG LOGIN
  if (userMode === "catalogLogin") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: 400, width: "100%", background: COLORS.white, padding: 40, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.darkBlue, marginBottom: 30, textAlign: "center" }}>👁️ View Catalog</h2>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyPress={e => e.key === "Enter" && handleCatalogLogin()} placeholder="Enter password" style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, marginBottom: 16, fontFamily: "inherit" }} autoFocus />
          <button onClick={handleCatalogLogin} style={{ width: "100%", padding: "12px 24px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>Login</button>
          <button onClick={() => { setUserMode("splash"); setPassword(""); }} style={{ width: "100%", padding: "12px 24px", background: COLORS.light, color: COLORS.text, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
        </div>
      </div>
    );
  }

  // ADMIN LOGIN
  if (userMode === "adminLogin") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: 400, width: "100%", background: COLORS.white, padding: 40, borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.darkBlue, marginBottom: 30, textAlign: "center" }}>🔓 Admin Login</h2>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyPress={e => e.key === "Enter" && handleAdminLogin()} placeholder="Enter admin password" style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, marginBottom: 16, fontFamily: "inherit" }} autoFocus />
          <button onClick={handleAdminLogin} style={{ width: "100%", padding: "12px 24px", background: COLORS.purple, color: COLORS.white, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>Login</button>
          <button onClick={() => { setUserMode("splash"); setPassword(""); }} style={{ width: "100%", padding: "12px 24px", background: COLORS.light, color: COLORS.text, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>
        </div>
      </div>
    );
  }

  // ADMIN MENU
  if (userMode === "adminPanel" && !adminPanel) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 40, color: COLORS.darkBlue, textAlign: "center" }}>⚙️ ADMIN PANEL</h1>
          <button onClick={handleLogout} style={{ width: "100%", marginBottom: 20, padding: "12px 20px", background: COLORS.gray, color: COLORS.white, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>🔒 Logout</button>
          
          <button onClick={() => setAdminPanel("manageProducts")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: COLORS.white, border: `2px solid ${COLORS.primary}`, borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: COLORS.darkBlue }}>📦 MANAGE PRODUCTS</button>

          <button onClick={() => setAdminPanel("addProduct")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: COLORS.primary, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: COLORS.darkBlue }}>✨ ADD PRODUCT</button>
          
          <button onClick={() => setAdminPanel("leadTimes")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: COLORS.white, border: `2px solid ${COLORS.lime}`, borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: COLORS.darkBlue }}>⏱️ EDIT LEAD TIMES</button>
          
          <button onClick={() => setAdminPanel("priceTiers")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: COLORS.white, border: `2px solid ${COLORS.purple}`, borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: COLORS.darkBlue }}>💰 EDIT PRICE TIERS</button>
          
          <button onClick={() => setAdminPanel("categories")} style={{ width: "100%", marginBottom: 16, padding: "20px", background: COLORS.white, border: `2px solid ${COLORS.primary}`, borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: COLORS.darkBlue }}>📂 EDIT CATEGORIES</button>

          <button onClick={exportToCSV} style={{ width: "100%", marginBottom: 16, padding: "20px", background: COLORS.white, border: `2px solid ${COLORS.lime}`, borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: COLORS.lime }}>💾 EXPORT CSV</button>

          <button onClick={() => setAdminPanel("backup")} style={{ width: "100%", padding: "20px", background: COLORS.white, border: `2px solid ${COLORS.darkBlue}`, borderRadius: 12, cursor: "pointer", fontSize: 18, fontWeight: 700, color: COLORS.darkBlue }}>📥 BACKUP GUIDE</button>
        </div>
      </div>
    );
  }

  // MANAGE PRODUCTS PANEL
  if (userMode === "adminPanel" && adminPanel === "manageProducts") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: COLORS.darkBlue, color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.primary}` }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: COLORS.darkBlue }}>📦 MANAGE PRODUCTS</h1>
            <input type="text" value={manageProductSearch} onChange={e => setManageProductSearch(e.target.value)} placeholder="Search by product name..." style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, marginBottom: 20, fontFamily: "inherit" }} />
            
            <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 20 }}>Total: <strong>{filteredManageProducts.length}</strong> product(s)</div>

            {filteredManageProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: COLORS.gray }}>No products found</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.light }}>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: `2px solid ${COLORS.gray}` }}>Name</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: `2px solid ${COLORS.gray}` }}>Category</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: `2px solid ${COLORS.gray}` }}>Price</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: `2px solid ${COLORS.gray}` }}>Material</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: `2px solid ${COLORS.gray}` }}>MOQ</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 12, fontWeight: 700, borderBottom: `2px solid ${COLORS.gray}` }}>Lead Time</th>
                      <th style={{ padding: "12px", textAlign: "center", fontSize: 12, fontWeight: 700, borderBottom: `2px solid ${COLORS.gray}` }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManageProducts.map((p, idx) => (
                      <tr key={p.firestoreId} style={{ borderBottom: `1px solid ${COLORS.light}`, background: idx % 2 === 0 ? COLORS.light : COLORS.white }}>
                        <td style={{ padding: "12px", fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: "12px", fontSize: 13, color: COLORS.gray }}>{p.category}</td>
                        <td style={{ padding: "12px", fontSize: 13, color: COLORS.text, fontWeight: 600 }}>RM{parseFloat(p.price).toFixed(2)}</td>
                        <td style={{ padding: "12px", fontSize: 13, color: COLORS.gray }}>{p.material || "—"}</td>
                        <td style={{ padding: "12px", fontSize: 13, color: COLORS.gray }}>{p.moq}</td>
                        <td style={{ padding: "12px", fontSize: 13, color: COLORS.gray }}>{p.leadLabel}</td>
                        <td style={{ padding: "12px", textAlign: "center", display: "flex", gap: 8, justifyContent: "center" }}>
                          <button onClick={() => startEditProduct(p)} style={{ padding: "6px 12px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 11 }}>✏️ Edit</button>
                          <button onClick={() => deleteProduct(p.firestoreId)} style={{ padding: "6px 12px", background: "#ff5555", color: COLORS.white, border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 11 }}>🗑️ Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // BACKUP GUIDE
  if (userMode === "adminPanel" && adminPanel === "backup") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: COLORS.darkBlue, color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.darkBlue}` }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: COLORS.darkBlue }}>📥 FIREBASE BACKUP GUIDE</h1>
            
            <div style={{ marginBottom: 30, padding: 20, background: `${COLORS.primary}20`, borderRadius: 8, borderLeft: `4px solid ${COLORS.primary}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.darkBlue, marginBottom: 10 }}>Why Backup?</h3>
              <p style={{ fontSize: 14, color: COLORS.gray, margin: 0 }}>Firebase stores all your product data safely, but you should keep backups for extra protection. We recommend exporting data weekly.</p>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.darkBlue, marginBottom: 16 }}>📋 Method 1: CSV Export (EASIEST)</h2>
            <div style={{ marginBottom: 20, paddingLeft: 20 }}>
              <p style={{ fontSize: 14, color: COLORS.gray, margin: "0 0 8px" }}>1. Go back to Admin Panel</p>
              <p style={{ fontSize: 14, color: COLORS.gray, margin: "0 0 8px" }}>2. Click <strong>"💾 EXPORT CSV"</strong></p>
              <p style={{ fontSize: 14, color: COLORS.gray, margin: "0 0 8px" }}>3. A file downloads automatically</p>
              <p style={{ fontSize: 14, color: COLORS.gray, margin: 0 }}>4. Save it to Google Drive or your computer</p>
              <p style={{ fontSize: 12, color: COLORS.lime, marginTop: 10, fontWeight: 600 }}>✓ Do this weekly for safety!</p>
            </div>

            <div style={{ marginTop: 30, padding: 16, background: `${COLORS.lime}30`, borderRadius: 8, borderLeft: `4px solid ${COLORS.lime}` }}>
              <p style={{ fontSize: 13, color: COLORS.darkBlue, margin: 0, fontWeight: 600 }}>💡 TIP: Export CSV every Friday, save to Google Drive = disaster recovery ready!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LEAD TIMES PANEL
  if (userMode === "adminPanel" && adminPanel === "leadTimes") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: COLORS.darkBlue, color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.lime}` }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: COLORS.darkBlue }}>⏱️ EDIT LEAD TIMES</h1>
            <button onClick={addLeadTime} style={{ width: "100%", marginBottom: 20, padding: "12px 20px", background: COLORS.lime, color: COLORS.darkBlue, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ ADD LEAD TIME</button>
            {leadTimes.map(lt => (
              <div key={lt.id} style={{ padding: 16, background: COLORS.light, borderRadius: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{lt.label}</div>
                  <div style={{ fontSize: 13, color: COLORS.gray }}>{lt.sub}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editLeadTime(lt.id)} style={{ padding: "8px 16px", background: COLORS.lime, color: COLORS.darkBlue, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>EDIT</button>
                  <button onClick={() => deleteLeadTime(lt.id)} style={{ padding: "8px 16px", background: "#ff5555", color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // PRICE TIERS PANEL
  if (userMode === "adminPanel" && adminPanel === "priceTiers") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: COLORS.darkBlue, color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.purple}` }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: COLORS.darkBlue }}>💰 EDIT PRICE TIERS</h1>
            {priceTiers.map(pt => (
              <div key={pt.label} style={{ padding: 16, background: COLORS.light, borderRadius: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{pt.label}</div>
                  <div style={{ fontSize: 13, color: COLORS.gray }}>RM{pt.min} – {pt.max === Infinity ? "∞" : "RM" + pt.max}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editPriceTier(pt.label)} style={{ padding: "8px 16px", background: COLORS.purple, color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>EDIT</button>
                  <button onClick={() => deletePriceTier(pt.label)} style={{ padding: "8px 16px", background: "#ff5555", color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // CATEGORIES PANEL
  if (userMode === "adminPanel" && adminPanel === "categories") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: COLORS.darkBlue, color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.primary}` }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: COLORS.darkBlue }}>📂 EDIT CATEGORIES</h1>
            <button onClick={addCategory} style={{ width: "100%", marginBottom: 20, padding: "12px 20px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ ADD CATEGORY</button>
            {categories.map(cat => (
              <div key={cat} style={{ padding: 16, background: COLORS.light, borderRadius: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{cat}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editCategory(cat)} style={{ padding: "8px 16px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>EDIT</button>
                  <button onClick={() => deleteCategory(cat)} style={{ padding: "8px 16px", background: "#ff5555", color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ADD PRODUCT PANEL
  if (userMode === "adminPanel" && adminPanel === "addProduct") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <button onClick={() => setAdminPanel(null)} style={{ marginBottom: 20, padding: "10px 20px", background: COLORS.darkBlue, color: COLORS.white, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>← Back</button>
          <div style={{ background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.primary}` }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: COLORS.darkBlue }}>{editingId ? "EDIT PRODUCT" : "ADD PRODUCT"}</h1>
            <form onSubmit={handleAddOrEditProduct} style={{ display: "grid", gap: 20 }}>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Product name *" style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }}>
                  <option value="">Select category *</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Base Price (RM) *" style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <input type="text" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="Website link (optional)" style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }} />
                <input type="text" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} placeholder="Size (optional)" style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }} />
              </div>

              <input type="text" value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} placeholder="Material (e.g., Cotton, Polyester, Stainless Steel, PU Leather)" style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <select value={formData.leadTime} onChange={e => setFormData({...formData, leadTime: e.target.value})} style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }}>
                  {leadTimes.map(lt => <option key={lt.id} value={lt.id}>{lt.label} ({lt.sub})</option>)}
                </select>
                <input type="number" value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} placeholder="MOQ *" style={{ padding: "12px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, fontFamily: "inherit" }} />
              </div>

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

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.gray, marginBottom: 10 }}>Printing Options *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {OPTIONS.printing.map(option => (
                    <button key={option} type="button" onClick={() => togglePrinting(option)} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: formData.printing.includes(option) ? `1.5px solid ${COLORS.primary}` : `1px solid ${COLORS.light}`, background: formData.printing.includes(option) ? COLORS.primary : COLORS.white, color: formData.printing.includes(option) ? COLORS.darkBlue : COLORS.gray }}>{option}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding: 20, background: COLORS.light, borderRadius: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>💰 Pricing Tiers (Optional)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <input type="number" value={newTierMoq} onChange={e => setNewTierMoq(e.target.value)} placeholder="MOQ" style={{ padding: "10px", fontSize: 13, border: `1px solid ${COLORS.light}`, borderRadius: 6, fontFamily: "inherit" }} />
                  <input type="number" value={newTierPrice} onChange={e => setNewTierPrice(e.target.value)} placeholder="Price (RM)" style={{ padding: "10px", fontSize: 13, border: `1px solid ${COLORS.light}`, borderRadius: 6, fontFamily: "inherit" }} />
                </div>
                <button type="button" onClick={addPricingTier} style={{ width: "100%", padding: "10px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>+ Add Tier</button>

                {formData.pricingTiers.length > 0 && (
                  <div style={{ background: COLORS.white, borderRadius: 6, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: COLORS.light }}>
                          <th style={{ padding: "10px", textAlign: "left", fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${COLORS.light}` }}>MOQ</th>
                          <th style={{ padding: "10px", textAlign: "left", fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${COLORS.light}` }}>Price (RM)</th>
                          <th style={{ padding: "10px", textAlign: "left", fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${COLORS.light}` }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.pricingTiers.map((tier, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.light}` }}>
                            <td style={{ padding: "10px", fontSize: 13 }}>{tier.moq}</td>
                            <td style={{ padding: "10px", fontSize: 13 }}>RM{parseFloat(tier.price).toFixed(2)}</td>
                            <td style={{ padding: "10px" }}>
                              <button type="button" onClick={() => removePricingTier(idx)} style={{ padding: "4px 8px", background: "#ff5555", color: COLORS.white, border: "none", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" style={{ flex: 1, padding: "14px 24px", background: COLORS.primary, color: COLORS.darkBlue, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{editingId ? "UPDATE" : "ADD"}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); resetForm(); }} style={{ flex: 1, padding: "14px 24px", background: COLORS.gray, color: COLORS.white, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>CANCEL</button>}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // CATALOG VIEW
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "0 0 60px" }}>
      <ProductDetailPanel product={selectedProduct} onClose={() => setSelectedProduct(null)} />

      <div style={{ background: COLORS.primary, padding: "24px 32px", borderRadius: 8, marginBottom: 0 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: COLORS.darkBlue }}>Product Catalog</h1>
            <p style={{ margin: "6px 0 0", color: COLORS.darkBlue, fontSize: 12 }}>🔒 Secure Access</p>
          </div>
          <button onClick={handleLogout} style={{ padding: "10px 20px", background: COLORS.darkBlue, color: COLORS.primary, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔒 Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ paddingTop: 24, paddingBottom: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ width: "100%", boxSizing: "border-box", padding: "11px 16px", fontSize: 14, border: `1.5px solid ${COLORS.light}`, borderRadius: 8, background: COLORS.white }} />
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase", marginBottom: 10 }}>Category</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedCategory === cat ? `1.5px solid ${COLORS.darkBlue}` : `1.5px solid ${COLORS.light}`, background: selectedCategory === cat ? COLORS.darkBlue : COLORS.white, color: selectedCategory === cat ? COLORS.primary : COLORS.gray }}>{cat}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase", marginBottom: 10 }}>Price</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {priceTiers.map(tier => (
                <button key={tier.label} onClick={() => setSelectedPrice(selectedPrice === tier.label ? null : tier.label)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: selectedPrice === tier.label ? `1.5px solid ${COLORS.primary}` : `1.5px solid ${COLORS.light}`, background: selectedPrice === tier.label ? COLORS.primary : COLORS.white, color: selectedPrice === tier.label ? COLORS.darkBlue : COLORS.gray }}>{tier.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase", marginBottom: 10 }}>Lead Time</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {leadTimes.map(lt => {
                const c = OPTIONS.leadColors[lt.id] || { bg: COLORS.light, text: COLORS.gray, badge: COLORS.gray };
                const active = selectedLead === lt.id;
                return (
                  <button key={lt.id} onClick={() => setSelectedLead(selectedLead === lt.id ? null : lt.id)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: active ? `1.5px solid ${c.badge}` : `1.5px solid ${COLORS.light}`, background: active ? c.bg : COLORS.white, color: active ? c.text : COLORS.gray }}>{lt.sub}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {selectedCategory && <span onClick={() => setSelectedCategory(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: COLORS.darkBlue, color: COLORS.white, borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{selectedCategory} ×</span>}
            {selectedPrice && <span onClick={() => setSelectedPrice(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: COLORS.darkBlue, color: COLORS.white, borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{selectedPrice} ×</span>}
            {selectedLead && <span onClick={() => setSelectedLead(null)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: COLORS.darkBlue, color: COLORS.white, borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{leadTimes.find(lt => lt.id === selectedLead)?.sub} ×</span>}
            {(selectedCategory || selectedPrice || selectedLead) && <span onClick={clearAll} style={{ fontSize: 12, color: COLORS.primary, cursor: "pointer", fontWeight: 600 }}>Clear</span>}
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray }}><strong>{filtered.length}</strong> products</div>
        </div>

        <div style={{ height: 1, background: COLORS.light, margin: "16px 0 24px" }} />

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: COLORS.gray }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div>No products found</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 40 }}>
            {filtered.map(p => {
              const lc = OPTIONS.leadColors[p.leadTime] || { bg: COLORS.light, text: COLORS.gray, badge: COLORS.gray };
              return (
                <div key={p.firestoreId} onClick={() => setSelectedProduct(p)} style={{ background: COLORS.white, borderRadius: 10, padding: "18px 20px", border: `1.5px solid ${COLORS.light}`, overflow: "hidden", cursor: "pointer", transition: "all 0.3s ease" }}>
                  {p.image ? (
                    <div style={{ width: "calc(100% + 40px)", height: 240, marginLeft: -20, marginTop: -18, marginBottom: 14, background: COLORS.light, overflow: "hidden" }}>
                      <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: "calc(100% + 40px)", height: 240, marginLeft: -20, marginTop: -18, marginBottom: 14, background: COLORS.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>📦</div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase", marginBottom: 6 }}>{p.category}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{p.name}</div>
                  {p.size && <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Size: {p.size}</div>}
                  {p.material && <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 10 }}>Material: {p.material}</div>}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary }}>RM{parseFloat(p.price).toFixed(2)}</span>
                    <span style={{ fontSize: 12, color: COLORS.gray }}>/ unit</span>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: lc.bg, color: lc.text, borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: lc.badge }} />
                    {p.leadLabel}
                  </div>
                  
                  <div style={{ height: 1, background: COLORS.light, margin: "8px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.gray, marginTop: 10, marginBottom: 6 }}>
                    <span>MOQ: <strong>{p.moq}</strong></span>
                    <span style={{ fontSize: 11 }}>{p.printing}</span>
                  </div>

                  <div style={{ padding: "8px 0", background: COLORS.lime, borderRadius: 6, textAlign: "center", fontSize: 12, fontWeight: 600, color: COLORS.darkBlue }}>Click for Details →</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
