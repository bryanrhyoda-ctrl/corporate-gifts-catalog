import { useState, useMemo, useEffect } from "react";

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

// Sample products to start with
const SAMPLE_PRODUCTS = [
  {
    id: 1,
    name: "USB-C Power Bank",
    category: "Electronic",
    price: 35,
    leadTime: "L2",
    leadLabel: "5–7 days",
    moq: 50,
    image: "https://via.placeholder.com/400x300?text=USB+Power+Bank",
    branding: "Laser, Silkscreen"
  },
  {
    id: 2,
    name: "Stainless Steel Tumbler",
    category: "Bottle",
    price: 28,
    leadTime: "L1",
    leadLabel: "1–3 days",
    moq: 100,
    image: "https://via.placeholder.com/400x300?text=Tumbler",
    branding: "Laser, Emboss"
  },
  {
    id: 3,
    name: "Notebook with Pen",
    category: "Stationery",
    price: 12,
    leadTime: "L2",
    leadLabel: "5–7 days",
    moq: 200,
    image: "https://via.placeholder.com/400x300?text=Notebook",
    branding: "Print, Silkscreen"
  }
];

export default function CatalogWithCSVImport() {
  // Load products from localStorage or use samples
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('catalogProducts');
    return saved ? JSON.parse(saved) : SAMPLE_PRODUCTS;
  });
  const [leadTimes] = useState(DEFAULT_LEAD_TIMES);
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
  const [showCSVHelp, setShowCSVHelp] = useState(false);
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

  const categories = [...new Set(products.map(p => p.category))].sort();

  // Auto-save products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('catalogProducts', JSON.stringify(products));
  }, [products]);

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

  const activeFilters = [
    selectedCategory && { label: selectedCategory, clear: () => setSelectedCategory(null) },
    selectedPrice   && { label: selectedPrice,    clear: () => setSelectedPrice(null)    },
    selectedLead    && { label: selectedLead,      clear: () => setSelectedLead(null)     },
  ].filter(Boolean);

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
    setEditingId(null);
    alert("Logged out from admin mode");
  };

  const handleAddOrEditProduct = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.moq || formData.branding.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    if (editingId) {
      // Edit existing
      setProducts(products.map(p => 
        p.id === editingId 
          ? {
              ...p,
              name: formData.name,
              category: formData.category,
              price: parseInt(formData.price),
              leadTime: formData.leadTime,
              leadLabel: leadTimes.find(lt => lt.id === formData.leadTime)?.sub,
              moq: parseInt(formData.moq),
              image: formData.image,
              branding: formData.branding.join(", "),
            }
          : p
      ));
      alert("✓ Product updated");
    } else {
      // Add new
      const newProduct = {
        id: Math.max(...products.map(p => p.id), 0) + 1,
        name: formData.name,
        category: formData.category,
        price: parseInt(formData.price),
        leadTime: formData.leadTime,
        leadLabel: leadTimes.find(lt => lt.id === formData.leadTime)?.sub,
        moq: parseInt(formData.moq),
        image: formData.image,
        branding: formData.branding.join(", "),
      };
      setProducts([...products, newProduct]);
      alert("✓ Product added");
    }
    
    resetForm();
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
    setEditingId(product.id);
    setShowForm(true);
  };

  const deleteProduct = (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this product?")) return;
    setProducts(products.filter(p => p.id !== id));
    alert("✓ Product deleted");
  };

  const toggleBranding = (brand) => {
    setFormData(prev => ({
      ...prev,
      branding: prev.branding.includes(brand)
        ? prev.branding.filter(b => b !== brand)
        : [...prev.branding, brand]
    }));
  };

  const addLeadTime = () => {
    if (!newLeadTimeId.trim() || !newLeadTimeLabel.trim()) {
      alert("Please fill in all lead time fields");
      return;
    }
    const newLT = {
      id: newLeadTimeId,
      label: newLeadTimeLabel,
      sub: newLeadTimeSub || ""
    };
    // Check if already exists
    if (leadTimes.find(lt => lt.id === newLeadTimeId)) {
      alert("This lead time ID already exists");
      return;
    }
    const updated = [...leadTimes, newLT];
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
      alert("Please enter a category name");
      return;
    }
    if (categories.includes(newCategoryName)) {
      alert("This category already exists");
      return;
    }
    setNewCategoryName("");
    alert("✓ Next product you add in '" + newCategoryName + "' will create this category");
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({
        ...prev,
        image: e.target.result
      }));
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

  // CSV Export
  const exportToCSV = () => {
    const headers = ["id", "name", "category", "price", "leadTime", "leadLabel", "moq", "image", "branding"];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.category,
      p.price,
      p.leadTime,
      p.leadLabel,
      p.moq,
      p.image,
      p.branding
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.csv";
    a.click();
    alert("✓ CSV exported! Upload this to Google Sheets for backup.");
  };

  // CSV Import
  const handleCSVUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n").filter(line => line.trim());
        
        // Skip header
        const dataLines = lines.slice(1);
        const imported = dataLines.map((line, idx) => {
          const parts = line.match(/"([^"]*)"|([^,]+)/g) || [];
          const clean = parts.map(p => p.replace(/^"|"$/g, "").trim());
          
          return {
            id: parseInt(clean[0]) || idx + 1,
            name: clean[1] || "",
            category: clean[2] || "Other",
            price: parseInt(clean[3]) || 0,
            leadTime: clean[4] || "L2",
            leadLabel: clean[5] || "",
            moq: parseInt(clean[6]) || 0,
            image: clean[7] || "",
            branding: clean[8] || ""
          };
        }).filter(p => p.name); // Only keep rows with names

        if (imported.length === 0) {
          alert("❌ No valid products in CSV");
          return;
        }

        setProducts(imported);
        alert(`✓ Imported ${imported.length} products!`);
      } catch (err) {
        alert(`❌ Error parsing CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8f8f6", minHeight: "100vh", padding: "0 0 60px" }}>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 32, maxWidth: 400, width: "90%",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Admin Login</h2>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Enter password to access admin features</p>
            
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleAdminLogin()}
              placeholder="Enter admin password"
              style={{
                width: "100%", boxSizing: "border-box", padding: "11px 14px",
                fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                background: "#fff", outline: "none", color: "#1a1a1a",
                marginBottom: 16, fontFamily: "inherit"
              }}
              autoFocus
            />
            
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAdminLogin}
                style={{
                  flex: 1, padding: "10px 16px",
                  background: "#c8a96e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}>
                Login
              </button>
              <button onClick={() => { setShowAdminLogin(false); setAdminPassword(""); }}
                style={{
                  flex: 1, padding: "10px 16px",
                  background: "#ddd",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Times Management Modal */}
      {showLeadTimes && isAdmin && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 32, maxWidth: 600, width: "90%", maxHeight: "80vh",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)", overflowY: "auto"
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>⏱️ Manage Lead Times</h2>
            
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Add New Lead Time</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="text"
                  value={newLeadTimeId}
                  onChange={e => setNewLeadTimeId(e.target.value)}
                  placeholder="e.g., L5"
                  style={{
                    padding: "10px 14px",
                    fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                    background: "#fff", outline: "none", color: "#1a1a1a",
                    fontFamily: "inherit"
                  }}
                />
                <input
                  type="text"
                  value={newLeadTimeLabel}
                  onChange={e => setNewLeadTimeLabel(e.target.value)}
                  placeholder="e.g., L5 — Express"
                  style={{
                    padding: "10px 14px",
                    fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                    background: "#fff", outline: "none", color: "#1a1a1a",
                    fontFamily: "inherit"
                  }}
                />
                <input
                  type="text"
                  value={newLeadTimeSub}
                  onChange={e => setNewLeadTimeSub(e.target.value)}
                  placeholder="e.g., 1–2 days"
                  style={{
                    padding: "10px 14px",
                    fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                    background: "#fff", outline: "none", color: "#1a1a1a",
                    fontFamily: "inherit"
                  }}
                />
                <button onClick={addLeadTime}
                  style={{
                    padding: "10px 16px",
                    background: "#c8a96e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}>
                  Add Lead Time
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Existing Lead Times</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {leadTimes.map(lt => (
                  <div key={lt.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: 12, background: "#f5f5f5", borderRadius: 6
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1a1a1a" }}>{lt.id} — {lt.label}</div>
                      <div style={{ fontSize: 12, color: "#999" }}>{lt.sub}</div>
                    </div>
                    <button onClick={() => deleteLeadTime(lt.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#ff5555",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setShowLeadTimes(false)}
              style={{
                width: "100%", padding: "10px 16px",
                background: "#888",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Categories Management Modal */}
      {showCategories && isAdmin && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 32, maxWidth: 600, width: "90%", maxHeight: "80vh",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)", overflowY: "auto"
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>📂 Manage Categories</h2>
            
            <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Add New Category</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Apparel"
                  style={{
                    padding: "10px 14px",
                    fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                    background: "#fff", outline: "none", color: "#1a1a1a",
                    fontFamily: "inherit"
                  }}
                />
                <button onClick={addCategory}
                  style={{
                    padding: "10px 16px",
                    background: "#c8a96e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}>
                  Add Category
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 12 }}>Existing Categories</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map(cat => (
                  <span key={cat} style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "#f5f5f5", color: "#1a1a1a", borderRadius: 6,
                    padding: "8px 12px", fontSize: 13, fontWeight: 500
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <button onClick={() => setShowCategories(false)}
              style={{
                width: "100%", padding: "10px 16px",
                background: "#888",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* CSV Help Modal */}
      {showCSVHelp && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 32, maxWidth: 600, width: "90%", maxHeight: "80vh",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)", overflowY: "auto"
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>📊 CSV Import/Export Guide</h2>
            
            <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6, marginBottom: 20 }}>
              <h3 style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>How to Use CSV:</h3>
              
              <p><strong>Export:</strong> Click "📥 Export CSV" to download all products</p>
              <p><strong>Backup:</strong> Upload this CSV to your Google Sheets as backup</p>
              <p><strong>Edit:</strong> Edit products in Google Sheets or CSV file</p>
              <p><strong>Import:</strong> Click "📤 Import CSV" to upload updated list</p>
              
              <h3 style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: 8, marginTop: 16 }}>CSV Format:</h3>
              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 6, fontSize: 12, fontFamily: "monospace", overflowX: "auto", marginBottom: 12 }}>
                id,name,category,price,leadTime,leadLabel,moq,image,branding<br/>
                1,"USB Power Bank","Electronic",35,"L2","5-7 days",50,"https://...",Laser
              </div>

              <p style={{ color: "#c8a96e", fontWeight: 600 }}>⚠️ Important:</p>
              <ul style={{ marginLeft: 20 }}>
                <li>First row is header - don't delete it</li>
                <li>Columns must be in exact order</li>
                <li>Enclose text in quotes if it has commas</li>
                <li>Leave image column empty or add URLs</li>
              </ul>
            </div>
            
            <button onClick={() => setShowCSVHelp(false)}
              style={{
                width: "100%", padding: "10px 16px",
                background: "#c8a96e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}>
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: isAdmin ? "#8b5a1f" : "#1a1a1a", padding: "28px 32px 24px", borderBottom: "3px solid #c8a96e", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "#c8a96e", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
            Corporate Gifts Agency {isAdmin && "— ADMIN MODE"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.5px" }}>Product Catalog</h1>
              <p style={{ margin: "6px 0 0", color: "#9a9a9a", fontSize: 13 }}>
                💾 CSV Storage {isAdmin && "• Admin mode: Full control"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isAdmin ? (
                <>
                  <button onClick={() => { setShowLeadTimes(!showLeadTimes); setShowCategories(false); setShowForm(false); }}
                    style={{
                      padding: "10px 16px",
                      background: showLeadTimes ? "#555" : "#888",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                    ⏱️ Lead Times
                  </button>
                  <button onClick={() => { setShowCategories(!showCategories); setShowLeadTimes(false); setShowForm(false); }}
                    style={{
                      padding: "10px 16px",
                      background: showCategories ? "#555" : "#888",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                    📂 Categories
                  </button>
                  <button onClick={() => { setShowCSVHelp(!showCSVHelp); }}
                    style={{
                      padding: "10px 16px",
                      background: "#888",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                    ❓ CSV Help
                  </button>
                  <button onClick={exportToCSV}
                    style={{
                      padding: "10px 16px",
                      background: "#888",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                    📥 Export CSV
                  </button>
                  <label style={{
                    padding: "10px 16px",
                    background: "#888",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "inline-block"
                  }}>
                    📤 Import CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={e => handleCSVUpload(e.target.files?.[0])}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button onClick={() => { setShowForm(!showForm); setShowLeadTimes(false); setShowCategories(false); }}
                    style={{
                      padding: "10px 20px",
                      background: showForm ? "#555" : "#c8a96e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}>
                    + Add Product
                  </button>
                </>
              ) : null}
              <button onClick={isAdmin ? handleAdminLogout : () => setShowAdminLogin(true)}
                style={{
                  padding: "10px 16px",
                  background: isAdmin ? "#c8a96e" : "#666",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}>
                {isAdmin ? "🔒 Logout" : "🔓 Admin"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {showForm && isAdmin ? (
          // Add/Edit Product Form
          <div style={{ paddingTop: 32, paddingBottom: 40 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 32, border: "1.5px solid #e8e8e8" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 24 }}>
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>
              
              <form onSubmit={handleAddOrEditProduct} style={{ display: "grid", gap: 20 }}>
                
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, textTransform: "uppercase" }}>Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Premium USB Power Bank"
                    style={{
                      width: "100%", boxSizing: "border-box", padding: "10px 14px",
                      fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                      background: "#fff", outline: "none", color: "#1a1a1a",
                      fontFamily: "inherit"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, textTransform: "uppercase" }}>Category *</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      placeholder="e.g., Electronic"
                      list="categories"
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "10px 14px",
                        fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                        background: "#fff", outline: "none", color: "#1a1a1a",
                        fontFamily: "inherit"
                      }}
                    />
                    <datalist id="categories">
                      {categories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#c8a96e", marginBottom: 6, textTransform: "uppercase", fontStyle: "italic" }}>Price (RM) * (Admin Only)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      placeholder="0"
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "10px 14px",
                        fontSize: 14, border: "2px solid #c8a96e", borderRadius: 6,
                        background: "#fffbf7", outline: "none", color: "#1a1a1a",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#c8a96e", marginBottom: 6, textTransform: "uppercase", fontStyle: "italic" }}>Lead Time * (Admin Only)</label>
                    <select
                      value={formData.leadTime}
                      onChange={e => setFormData({...formData, leadTime: e.target.value})}
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "10px 14px",
                        fontSize: 14, border: "2px solid #c8a96e", borderRadius: 6,
                        background: "#fffbf7", outline: "none", color: "#1a1a1a",
                        fontFamily: "inherit"
                      }}
                    >
                      {DEFAULT_LEAD_TIMES.map(lt => <option key={lt.id} value={lt.id}>{lt.label} • {lt.sub}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, textTransform: "uppercase" }}>MOQ (Pieces) *</label>
                    <input
                      type="number"
                      value={formData.moq}
                      onChange={e => setFormData({...formData, moq: e.target.value})}
                      placeholder="0"
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "10px 14px",
                        fontSize: 14, border: "1.5px solid #ddd", borderRadius: 6,
                        background: "#fff", outline: "none", color: "#1a1a1a",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 10, textTransform: "uppercase" }}>Product Image</label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    style={{
                      border: dragActive ? "2px solid #c8a96e" : "2px dashed #ddd",
                      borderRadius: 8,
                      padding: "32px",
                      textAlign: "center",
                      background: dragActive ? "#f9f7f3" : "#fafafa",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageUpload(e.target.files?.[0])}
                      style={{ display: "none" }}
                      id="imageUploadInput"
                    />
                    <label htmlFor="imageUploadInput" style={{ cursor: "pointer" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Drag & drop image or click</div>
                    </label>
                  </div>
                </div>

                {formData.image && (
                  <div>
                    <div style={{ width: 120, height: 120, borderRadius: 8, overflow: "hidden", background: "#f5f5f5" }}>
                      <img src={formData.image} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 10, textTransform: "uppercase" }}>Branding Options * (Select at least one)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {BRANDING_OPTIONS.map(brand => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => toggleBranding(brand)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          border: formData.branding.includes(brand) ? "1.5px solid #c8a96e" : "1.5px solid #ddd",
                          background: formData.branding.includes(brand) ? "#c8a96e" : "#fff",
                          color: formData.branding.includes(brand) ? "#fff" : "#444",
                          transition: "all 0.15s",
                          fontFamily: "inherit"
                        }}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit"
                    style={{
                      flex: 1, padding: "12px 24px",
                      background: "#c8a96e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    {editingId ? "Update Product" : "Add Product"}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm}
                      style={{
                        padding: "12px 24px",
                        background: "#888",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit"
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div style={{ paddingTop: 28, paddingBottom: 4 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by product name or category..."
                style={{
                  width: "100%", boxSizing: "border-box", padding: "11px 16px",
                  fontSize: 14, border: "1.5px solid #ddd", borderRadius: 8,
                  background: "#fff", outline: "none", color: "#1a1a1a",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
              />
            </div>

            {/* Filter Row */}
            <div style={{ display: "flex", gap: 32, marginTop: 24, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Category</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      style={{
                        padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                        border: selectedCategory === cat ? "1.5px solid #1a1a1a" : "1.5px solid #ddd",
                        background: selectedCategory === cat ? "#1a1a1a" : "#fff",
                        color: selectedCategory === cat ? "#fff" : "#444",
                        transition: "all 0.15s"
                      }}>{cat}</button>
                  ))}
                </div>
              </div>

              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Price per Unit</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PRICE_TIERS.map(tier => (
                    <button key={tier.label} onClick={() => setSelectedPrice(selectedPrice === tier.label ? null : tier.label)}
                      style={{
                        padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                        border: selectedPrice === tier.label ? "1.5px solid #c8a96e" : "1.5px solid #ddd",
                        background: selectedPrice === tier.label ? "#c8a96e" : "#fff",
                        color: selectedPrice === tier.label ? "#fff" : "#444",
                        transition: "all 0.15s"
                      }}>{tier.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginBottom: 10 }}>Lead Time</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {DEFAULT_LEAD_TIMES.map(lt => {
                    const c = LEAD_COLORS[lt.id] || { bg: "#f0f0f0", text: "#666", dot: "#999" };
                    const active = selectedLead === lt.id;
                    return (
                      <button key={lt.id} onClick={() => setSelectedLead(selectedLead === lt.id ? null : lt.id)}
                        style={{
                          padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                          border: active ? `1.5px solid ${c.dot}` : "1.5px solid #ddd",
                          background: active ? c.bg : "#fff",
                          color: active ? c.text : "#444",
                          transition: "all 0.15s"
                        }}>{lt.id} · {lt.sub}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active filters + count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {activeFilters.length > 0 && activeFilters.map((f, i) => (
                  <span key={i} onClick={f.clear} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "#1a1a1a", color: "#fff", borderRadius: 20,
                    padding: "4px 11px 4px 13px", fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}>
                    {f.label} <span style={{ fontSize: 14, opacity: 0.7 }}>×</span>
                  </span>
                ))}
                {activeFilters.length > 1 && (
                  <span onClick={clearAll} style={{ fontSize: 12, color: "#c8a96e", cursor: "pointer", fontWeight: 600 }}>Clear all</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>
                <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{filtered.length}</span> product{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div style={{ height: 1, background: "#e5e5e5", margin: "16px 0 24px" }} />

            {/* Product Grid */}
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
                    <div key={p.id} style={{
                      background: "#fff", borderRadius: 10, padding: "18px 20px",
                      border: "1.5px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      overflow: "hidden"
                    }}>
                      {p.image ? (
                        <div style={{
                          width: "calc(100% + 40px)", height: 180, marginLeft: -20, marginTop: -18, marginBottom: 14,
                          background: "#f5f5f5", overflow: "hidden"
                        }}>
                          <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{
                          width: "calc(100% + 40px)", height: 180, marginLeft: -20, marginTop: -18, marginBottom: 14,
                          background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#ddd", fontSize: 40
                        }}>📦</div>
                      )}

                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 5 }}>{p.category}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 14, lineHeight: 1.3 }}>{p.name}</div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a" }}>RM{p.price}</span>
                        <span style={{ fontSize: 12, color: "#aaa" }}>/ unit</span>
                      </div>

                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: lc.bg, color: lc.text, borderRadius: 6,
                        padding: "4px 9px", fontSize: 11.5, fontWeight: 600, marginBottom: 12
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: lc.dot, display: "inline-block" }} />
                        {p.leadTime} · {p.leadLabel}
                      </div>

                      <div style={{ height: 1, background: "#f0f0f0", margin: "2px 0 12px" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#777", marginBottom: 12 }}>
                        <span>MOQ: <strong>{p.moq} pcs</strong></span>
                        <span style={{ textAlign: "right", maxWidth: "50%", fontSize: 11 }}>{p.branding}</span>
                      </div>

                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEditProduct(p)}
                            style={{
                              flex: 1, padding: "6px 8px",
                              background: "#f0f0f0",
                              color: "#1a1a1a",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => deleteProduct(p.id)}
                            style={{
                              flex: 1, padding: "6px 8px",
                              background: "#ff5555",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}>
                            🗑️ Delete
                          </button>
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
