import { useState, useMemo, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { COLORS, DEFAULTS, OPTIONS } from "./constants";
import ProductCard from "./components/ProductCard";
import ProductDetailPanel from "./components/ProductDetailPanel";
import AdminMenu from "./components/AdminMenu";
import ManageProducts from "./components/ManageProducts";
import AddProduct from "./components/AddProduct";
import EditLeadTimes from "./components/EditLeadTimes";
import EditPriceTiers from "./components/EditPriceTiers";
import EditCategories from "./components/EditCategories";

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
                <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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
          
          <AdminMenu onSelectAction={setAdminPanel} />
        </div>
      </div>
    );
  }

  // MANAGE PRODUCTS PANEL
  if (userMode === "adminPanel" && adminPanel === "manageProducts") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.primary}` }}>
          <ManageProducts products={products} onEdit={startEditProduct} onBack={() => setAdminPanel(null)} />
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
        <div style={{ maxWidth: 600, margin: "0 auto", background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.lime}` }}>
          <EditLeadTimes leadTimes={leadTimes} setLeadTimes={setLeadTimes} onBack={() => setAdminPanel(null)} />
        </div>
      </div>
    );
  }

  // PRICE TIERS PANEL
  if (userMode === "adminPanel" && adminPanel === "priceTiers") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.purple}` }}>
          <EditPriceTiers priceTiers={priceTiers} setPriceTiers={setPriceTiers} onBack={() => setAdminPanel(null)} />
        </div>
      </div>
    );
  }

  // CATEGORIES PANEL
  if (userMode === "adminPanel" && adminPanel === "categories") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.primary}` }}>
          <EditCategories categoryList={categoryList} setCategoryList={setCategoryList} onBack={() => setAdminPanel(null)} />
        </div>
      </div>
    );
  }

  // ADD PRODUCT PANEL
  if (userMode === "adminPanel" && adminPanel === "addProduct") {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", background: COLORS.white, padding: 40, borderRadius: 12, border: `2px solid ${COLORS.primary}` }}>
          <AddProduct
            formData={formData}
            setFormData={setFormData}
            editingId={editingId}
            categories={categoryList}
            leadTimes={leadTimes}
            priceTiers={priceTiers}
            newTierMoq={newTierMoq}
            setNewTierMoq={setNewTierMoq}
            newTierPrice={newTierPrice}
            setNewTierPrice={setNewTierPrice}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleImageUpload={handleImageUpload}
            onSubmit={handleAddOrEditProduct}
            onBack={() => setAdminPanel(null)}
            onAddTier={addPricingTier}
            onRemoveTier={removePricingTier}
          />
        </div>
      </div>
    );
  }

  // CATALOG VIEW
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.light, minHeight: "100vh", padding: "0 0 60px" }}>
      {selectedProduct && <ProductDetailPanel product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

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
            {filtered.map(p => (
              <ProductCard key={p.firestoreId} product={p} onSelect={setSelectedProduct} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
