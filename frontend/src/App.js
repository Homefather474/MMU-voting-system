import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ═══════════════════════════════════════════════════════════════
// API SERVICE LAYER
// ═══════════════════════════════════════════════════════════════
const API_BASE = "https://mmu-voting-backend.onrender.com/api";

const api = {
  token: null,
  setToken(t) { this.token = t; localStorage && (window._token = t); },
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  },
  async get(path) {
    const r = await fetch(`${API_BASE}${path}`, { headers: this.headers() });
    if (r.status === 401) throw new Error("UNAUTHORIZED");
    return r.json();
  },
  async post(path, data) {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "POST", headers: this.headers(), body: JSON.stringify(data),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || JSON.stringify(json));
    return json;
  },
  async patch(path, data) {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "PATCH", headers: this.headers(), body: JSON.stringify(data),
    });
    return r.json();
  },
  async del(path) {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "DELETE", headers: this.headers(),
    });
    return r.ok;
  },
};

// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (student_id, password) => {
    setLoading(true);
    try {
      const data = await api.post("/accounts/login/", { student_id, password });
      api.setToken(data.token);
      setUser(data.user);
      return data;
    } finally { setLoading(false); }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await api.post("/accounts/register/", userData);
      api.setToken(data.token);
      setUser(data.user);
      return data;
    } finally { setLoading(false); }
  };

  const logout = () => { api.setToken(null); setUser(null); };

  const refreshUser = async () => {
    try {
      const fresh = await api.get("/accounts/profile/");
      setUser(fresh);
      return fresh;
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE HOOK
// ═══════════════════════════════════════════════════════════════
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const colors = {
  bg: "#0c0a14",
  card: "#15121f",
  cardAlt: "#1e1a2e",
  border: "#2a2540",
  accent: "#b91c3c",
  accentDim: "#7f1d2f",
  accentBright: "#e11d48",
  danger: "#ef4444",
  warning: "#d4a017",
  blue: "#1a3a6b",
  purple: "#9f1239",
  gold: "#d4a017",
  text: "#e8e4f0",
  textDim: "#a8a0b8",
  textMuted: "#6e6580",
  white: "#ffffff",
};

const font = "'Segoe UI', system-ui, -apple-system, sans-serif";

const baseStyles = {
  page: { minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden", background: `linear-gradient(135deg, ${colors.bg} 0%, #0f172a 50%, #1a1a2e 100%)`, fontFamily: font, color: colors.text, padding: 0, margin: 0, boxSizing: "border-box" },
  card: { background: colors.card, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 20, marginBottom: 16, backdropFilter: "blur(10px)" },
  cardHeader: { fontSize: 16, fontWeight: 700, color: colors.white, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
  btn: { padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s", fontFamily: font, display: "inline-flex", alignItems: "center", gap: 6 },
  btnPrimary: { background: `linear-gradient(135deg, ${colors.accent}, #6b1525)`, color: colors.white },
  btnDanger: { background: `linear-gradient(135deg, ${colors.danger}, #dc2626)`, color: colors.white },
  btnOutline: { background: "transparent", border: `1px solid ${colors.border}`, color: colors.textDim },
  btnBlue: { background: `linear-gradient(135deg, ${colors.blue}, #0f2a52)`, color: colors.white },
  input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.cardAlt, color: colors.text, fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: colors.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" },
  badge: (color) => ({ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${color}22`, color: color, border: `1px solid ${color}44` }),
  stat: { textAlign: "center", padding: 16 },
  statNum: { fontSize: 28, fontWeight: 800, background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
};

// ═══════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════
const StatusBadge = ({ status }) => {
  const map = {
    not_started: { color: colors.textMuted, label: "Not Started" },
    registration: { color: colors.accent, label: "Registration Open" },
    voting: { color: colors.accent, label: "Voting Open" },
    ended: { color: colors.warning, label: "Ended" },
    results_published: { color: colors.purple, label: "Results Published" },
  };
  const s = map[status] || { color: colors.textMuted, label: status };
  return <span style={baseStyles.badge(s.color)}>{s.label}</span>;
};

const LoadingSpinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 36, height: 36, border: `3px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Alert = ({ type = "info", children }) => {
  const c = { success: colors.accent, error: colors.danger, warning: colors.warning, info: colors.accent }[type];
  return (
    <div style={{ padding: "12px 16px", borderRadius: 10, background: `${c}15`, border: `1px solid ${c}33`, color: c, fontSize: 14, marginBottom: 14 }}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FIREWORKS CELEBRATION OVERLAY
// ═══════════════════════════════════════════════════════════════
const Fireworks = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  const palette = [colors.accent, colors.gold, "#ffffff", colors.accentBright, "#ff8fa3"];
  const bursts = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    top: 10 + Math.random() * 45,
    delay: Math.random() * 0.9,
    color: palette[i % palette.length],
  }));

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 500, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes fw-burst {
          0% { transform: scale(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes fw-particle {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
        }
      `}</style>
      {bursts.map((b) => (
        <div key={b.id} style={{ position: "absolute", left: `${b.left}%`, top: `${b.top}%`, width: 0, height: 0 }}>
          {Array.from({ length: 14 }).map((_, j) => {
            const angle = (j / 14) * 2 * Math.PI;
            const dist = 60 + Math.random() * 50;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            return (
              <div key={j} style={{
                position: "absolute", width: 7, height: 7, borderRadius: "50%",
                background: b.color, boxShadow: `0 0 8px 2px ${b.color}`,
                animation: `fw-particle 1.1s ease-out ${b.delay}s forwards`,
                "--dx": `${dx}px`, "--dy": `${dy}px`,
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
};

const StatCard = ({ icon, value, label }) => (
  <div style={{ ...baseStyles.card, ...baseStyles.stat, marginBottom: 0 }}>
    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
    <div style={baseStyles.statNum}>{value}</div>
    <div style={baseStyles.statLabel}>{label}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// NAVBAR — Mobile hamburger menu
// ═══════════════════════════════════════════════════════════════
const Navbar = ({ currentView, setView }) => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin" || user?.role === "sysadmin";

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "elections", label: "Elections", icon: "🗳️" },
    { key: "verify", label: "Verify Vote", icon: "🔍" },
  ];
  if (isAdmin) navItems.push({ key: "admin", label: "Admin Panel", icon: "⚙️" });
  if (user?.role === "sysadmin") navItems.push({ key: "system", label: "System", icon: "🖥️" });

  const handleNav = (key) => { setView(key); setMenuOpen(false); };

  return (
    <nav style={{ background: `${colors.card}ee`, borderBottom: `1px solid ${colors.border}`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/mmu-logo.png" alt="MMU" style={{ width: 32, height: 32, objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.white, lineHeight: 1 }}>MMU E-Vote</div>
            <div style={{ fontSize: 9, color: colors.warning, letterSpacing: 1 }}>BLOCKCHAIN SECURED</div>
          </div>
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 2 }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => handleNav(item.key)}
                style={{ ...baseStyles.btn, padding: "7px 12px", fontSize: 13, background: currentView === item.key ? `${colors.accent}22` : "transparent", color: currentView === item.key ? colors.accent : colors.textDim, border: currentView === item.key ? `1px solid ${colors.accent}44` : "1px solid transparent", borderRadius: 8 }}>
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Desktop user info + logout */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{user?.full_name}</div>
              <div style={{ fontSize: 10, color: colors.textMuted }}>{user?.student_id} · {user?.role}</div>
            </div>
            <button onClick={logout} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, padding: "7px 12px", fontSize: 12 }}>Logout</button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "transparent", border: `1px solid ${colors.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: colors.text, fontSize: 18 }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{ background: colors.card, borderTop: `1px solid ${colors.border}`, padding: 12 }}>
          {/* User info */}
          <div style={{ padding: "10px 12px", marginBottom: 8, background: colors.cardAlt, borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.white }}>{user?.full_name}</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{user?.student_id} · {user?.role}</div>
          </div>
          {/* Nav items */}
          {navItems.map(item => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              style={{ ...baseStyles.btn, width: "100%", justifyContent: "flex-start", marginBottom: 4, background: currentView === item.key ? `${colors.accent}22` : "transparent", color: currentView === item.key ? colors.accent : colors.textDim, border: currentView === item.key ? `1px solid ${colors.accent}44` : "1px solid transparent" }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
          <button onClick={() => { logout(); setMenuOpen(false); }}
            style={{ ...baseStyles.btn, ...baseStyles.btnOutline, width: "100%", justifyContent: "center", marginTop: 8 }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════
const LoginPage = () => {
  const { login, register, loading } = useAuth();
  const isMobile = useIsMobile();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ student_id: "", password: "", full_name: "", email: "", faculty: "", department: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) { await register(form); }
      else { await login(form.student_id, form.password); }
    } catch (err) { setError(err.message); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ ...baseStyles.page, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12, boxShadow: `0 8px 32px ${colors.accent}33` }}>
            <img src="/mmu-logo.png" alt="MMU" style={{ width: 64, height: 64, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: colors.white, margin: 0 }}>MMU E-Vote</h1>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: "6px 0 0" }}>Smart Contract-Based Voting System</p>
          <p style={{ color: colors.textMuted, fontSize: 11 }}>Multimedia University of Kenya</p>
        </div>

        <div style={baseStyles.card}>
          <div style={{ display: "flex", marginBottom: 20, background: colors.cardAlt, borderRadius: 10, padding: 4 }}>
            <button onClick={() => setIsRegister(false)} style={{ ...baseStyles.btn, flex: 1, justifyContent: "center", background: !isRegister ? colors.accent : "transparent", color: !isRegister ? colors.white : colors.textDim, borderRadius: 8, fontSize: 13 }}>Sign In</button>
            <button onClick={() => setIsRegister(true)} style={{ ...baseStyles.btn, flex: 1, justifyContent: "center", background: isRegister ? colors.accent : "transparent", color: isRegister ? colors.white : colors.textDim, borderRadius: 8, fontSize: 13 }}>Register</button>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={baseStyles.label}>Student ID</label>
              <input style={baseStyles.input} placeholder="e.g. CIT-222-001/2021" value={form.student_id} onChange={set("student_id")} required />
            </div>

            {isRegister && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={baseStyles.label}>Full Name</label>
                  <input style={baseStyles.input} placeholder="Your full name" value={form.full_name} onChange={set("full_name")} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={baseStyles.label}>Email</label>
                  <input style={baseStyles.input} type="email" placeholder="your.email@students.mmu.ac.ke" value={form.email} onChange={set("email")} required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={baseStyles.label}>Faculty</label>
                    <input style={baseStyles.input} placeholder="Computing & IT" value={form.faculty} onChange={set("faculty")} />
                  </div>
                  <div>
                    <label style={baseStyles.label}>Department</label>
                    <input style={baseStyles.input} placeholder="Computer Tech" value={form.department} onChange={set("department")} />
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={baseStyles.label}>Password</label>
              <input style={baseStyles.input} type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required />
            </div>

            <button type="submit" disabled={loading}
              style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: "100%", justifyContent: "center", padding: 14, fontSize: 15, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, padding: "14px 0 0", borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 11, color: colors.textMuted, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colors.accent }} />
              Secured by Ethereum Blockchain
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
const Dashboard = ({ setView, setSelectedElection }) => {
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, e] = await Promise.all([api.get("/voting/dashboard/"), api.get("/voting/elections/")]);
        setStats(s); setElections(e);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
    refreshUser();
  }, []);

  if (loading) return <LoadingSpinner />;

  const activeElections = elections.filter(e => e.status === "voting" || e.status === "registration");
  const container = { maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" };

  return (
    <div style={container}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: colors.white, margin: 0 }}>
          Welcome, {user?.full_name?.split(" ")[0]}
        </h1>
        <p style={{ color: colors.textMuted, margin: "4px 0 0", fontSize: 13 }}>Your voting overview</p>
      </div>

      {/* Stats grid — 2x2 on mobile, 4 cols on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard icon="🗳️" value={stats?.total_elections || 0} label="Total Elections" />
        <StatCard icon="🟢" value={stats?.active_elections || 0} label="Active Now" />
        <StatCard icon="👥" value={stats?.total_voters || 0} label="Registered Voters" />
        <StatCard icon="✅" value={stats?.my_votes || 0} label="My Votes Cast" />
      </div>

      {activeElections.length > 0 && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>🔴</span> Active Elections</div>
          {activeElections.map(election => (
            <div key={election.id} style={{ background: colors.cardAlt, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.white, margin: 0, flex: 1, paddingRight: 8 }}>{election.title}</h3>
                <StatusBadge status={election.status} />
              </div>
              <p style={{ fontSize: 13, color: colors.textDim, margin: "0 0 10px" }}>{election.description?.substring(0, 100)}...</p>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                📊 {election.total_votes} votes · 👥 {election.total_voters} registered · 🏷️ {election.candidates?.length} candidates
              </div>
              <button onClick={() => { setSelectedElection(election); setView("election-detail"); }}
                style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: isMobile ? "100%" : "auto", justifyContent: "center", fontSize: 13 }}>
                {election.status === "voting" ? "Vote Now →" : "View →"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* All elections — card list on mobile, table on desktop */}
      <div style={baseStyles.card}>
        <div style={baseStyles.cardHeader}><span>📜</span> All Elections</div>
        {elections.length === 0 ? (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: 20 }}>No elections found</p>
        ) : isMobile ? (
          elections.map(e => (
            <div key={e.id} onClick={() => { setSelectedElection(e); setView("election-detail"); }}
              style={{ background: colors.cardAlt, borderRadius: 10, padding: 14, marginBottom: 10, border: `1px solid ${colors.border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: colors.white, fontSize: 14 }}>{e.title}</span>
                <span style={{ color: colors.accent }}>→</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <StatusBadge status={e.status} />
                <span style={{ fontSize: 11, color: colors.textMuted }}>👤 {e.candidates?.length} · 🗳️ {e.total_votes}</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {["Title", "Status", "Candidates", "Voters", "Votes", ""].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {elections.map(e => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${colors.border}22`, cursor: "pointer" }} onClick={() => { setSelectedElection(e); setView("election-detail"); }}>
                    <td style={{ padding: "12px", fontWeight: 600, color: colors.white }}>{e.title}</td>
                    <td style={{ padding: "12px" }}><StatusBadge status={e.status} /></td>
                    <td style={{ padding: "12px", color: colors.textDim }}>{e.candidates?.length || 0}</td>
                    <td style={{ padding: "12px", color: colors.textDim }}>{e.total_voters}</td>
                    <td style={{ padding: "12px", color: colors.textDim }}>{e.total_votes}</td>
                    <td style={{ padding: "12px" }}><span style={{ color: colors.accent, fontSize: 13 }}>View →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ELECTION DETAIL / VOTING
// ═══════════════════════════════════════════════════════════════
const ElectionDetail = ({ election: initialElection, setView, setSelectedElection }) => {
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();
  const [election, setElection] = useState(initialElection);
  const [myStatus, setMyStatus] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [confirmVote, setConfirmVote] = useState(false);
  const [voteResult, setVoteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [showFireworks, setShowFireworks] = useState(false);

  const container = { maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" };

  const load = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([
        api.get(`/voting/elections/${election.id}/`),
        api.get(`/voting/elections/${election.id}/my-status/`),
      ]);
      setElection(e); setMyStatus(s);
      if (e.status === "ended" || e.status === "results_published") {
        try { const r = await api.get(`/voting/elections/${election.id}/results/`); setResults(r); } catch (err) {}
      }
    } catch (err) { console.error(err); }
  }, [election.id]);

  // Always pull the latest eligibility status when viewing an election,
  // so a voter marked eligible by an admin sees it without re-logging in
  useEffect(() => { refreshUser(); }, []);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    setLoading(true); setError("");
    try { await api.post(`/voting/elections/${election.id}/register/`, {}); await load(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVote = async () => {
    setLoading(true); setError("");
    try {
      const result = await api.post(`/voting/elections/${election.id}/vote/`, { candidate_id: selectedCandidate.ballot_number });
      setVoteResult(result); setConfirmVote(false); await load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const totalVotesResult = results?.results?.reduce((s, r) => s + r.vote_count, 0) || results?.total_votes || 0;

  return (
    <div style={container}>
      <button onClick={() => setView("elections")} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, marginBottom: 16, fontSize: 13 }}>← Back</button>

      {/* Header card */}
      <div style={baseStyles.card}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: colors.white, margin: 0 }}>{election.title}</h1>
            <StatusBadge status={election.status} />
          </div>
          <p style={{ color: colors.textDim, margin: 0, fontSize: 13 }}>{election.description}</p>
        </div>
        {/* Stats — 2x2 on mobile, 4 cols on desktop */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
          {[
            { val: election.candidates?.length || 0, label: "Candidates", color: colors.accent },
            { val: election.total_voters, label: "Registered", color: colors.gold },
            { val: election.total_votes, label: "Votes Cast", color: colors.purple },
            { val: `${election.total_voters > 0 ? Math.round(election.total_votes / election.total_voters * 100) : 0}%`, label: "Turnout", color: colors.warning },
          ].map(({ val, label, color }) => {
            const clickable = label === "Registered" && (user?.role === "admin" || user?.role === "sysadmin");
            return (
              <div key={label}
                onClick={clickable ? () => { setSelectedElection?.(election); setView("voter-list"); } : undefined}
                style={{ textAlign: "center", padding: "10px 0", cursor: clickable ? "pointer" : "default", borderRadius: 8, transition: "background 0.15s" }}
                onMouseEnter={clickable ? (e) => e.currentTarget.style.background = `${colors.accent}0f` : undefined}
                onMouseLeave={clickable ? (e) => e.currentTarget.style.background = "transparent" : undefined}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                  {label}{clickable ? " →" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Voter Status */}
      {user?.role === "voter" && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>📋</span> Your Voting Status</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <span style={baseStyles.badge(myStatus?.is_registered ? colors.accent : colors.textMuted)}>
              {myStatus?.is_registered ? "✅ Registered" : "⬜ Not Registered"}
            </span>
            <span style={baseStyles.badge(myStatus?.has_voted ? colors.accent : colors.textMuted)}>
              {myStatus?.has_voted ? "✅ Vote Cast" : "⬜ Not Voted"}
            </span>
          </div>

          {!user?.is_eligible && (
            <Alert type="warning">
              ⚠️ Your account is not yet marked eligible to vote. Please contact an electoral administrator to have your eligibility confirmed before you can register.
            </Alert>
          )}

          {user?.is_eligible && (election.status === "registration" || election.status === "voting") && !myStatus?.is_registered && (
            <div>
              <p style={{ color: colors.textDim, fontSize: 13, marginBottom: 10 }}>Register before you can vote.</p>
              <button onClick={handleRegister} disabled={loading}
                style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: isMobile ? "100%" : "auto", justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Registering..." : "📝 Register to Vote"}
              </button>
            </div>
          )}

          {myStatus?.is_registered && !myStatus?.has_voted && election.status === "voting" && (
            <Alert type="info">You are registered! Select a candidate below to cast your vote.</Alert>
          )}

          {myStatus?.has_voted && myStatus?.transaction_hash && (
            <Alert type="success">
              Vote recorded! Transaction: <span style={{ fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>{myStatus.transaction_hash}</span>
            </Alert>
          )}
        </div>
      )}

      {/* Vote result */}
      {voteResult && (
        <div style={{ ...baseStyles.card, border: `2px solid ${colors.accent}` }}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: colors.accent, margin: 0 }}>Vote Cast Successfully!</h2>
            <p style={{ color: colors.textDim, margin: "10px 0", fontSize: 13 }}>Your vote is securely recorded on the blockchain</p>
            <div style={{ background: colors.cardAlt, borderRadius: 10, padding: 14, marginTop: 12, fontFamily: "monospace", fontSize: 12, color: colors.text, wordBreak: "break-all" }}>
              <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>TRANSACTION HASH</div>
              {voteResult.transaction_hash}
            </div>
            <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 10 }}>Save this hash to verify your vote later.</p>
          </div>
        </div>
      )}

      {/* Voting candidates */}
      {election.status === "voting" && myStatus?.is_registered && !myStatus?.has_voted && !voteResult && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>🗳️</span> Cast Your Vote</div>
          <p style={{ color: colors.textDim, fontSize: 13, marginBottom: 16 }}>Tap a candidate to select, then confirm. This is irreversible.</p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {election.candidates?.map(c => (
              <div key={c.id} onClick={() => { setSelectedCandidate(c); setConfirmVote(false); }}
                style={{ background: selectedCandidate?.id === c.id ? `${colors.accent}15` : colors.cardAlt, border: `2px solid ${selectedCandidate?.id === c.id ? colors.accent : colors.border}`, borderRadius: 14, padding: 16, cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${colors.accent}, ${colors.cardAlt})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: colors.white, flexShrink: 0 }}>{c.ballot_number}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: colors.white }}>{c.full_name}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>{c.position}</div>
                  </div>
                  {selectedCandidate?.id === c.id && <span style={{ fontSize: 20 }}>✅</span>}
                </div>
                <p style={{ fontSize: 13, color: colors.textDim, margin: 0, lineHeight: 1.5 }}>{c.manifesto_summary}</p>
              </div>
            ))}
          </div>

          {selectedCandidate && !confirmVote && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button onClick={() => setConfirmVote(true)} style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: isMobile ? "100%" : "auto", justifyContent: "center", padding: "12px 32px", fontSize: 14 }}>
                Confirm: {selectedCandidate.full_name} →
              </button>
            </div>
          )}

          {confirmVote && (
            <div style={{ marginTop: 16, background: `${colors.warning}15`, border: `1px solid ${colors.warning}44`, borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>⚠️</div>
              <h3 style={{ color: colors.warning, margin: "0 0 8px", fontSize: 16 }}>Confirm Your Vote</h3>
              <p style={{ color: colors.textDim, fontSize: 13, margin: "0 0 16px" }}>
                Vote for <strong style={{ color: colors.white }}>{selectedCandidate.full_name}</strong> (#{selectedCandidate.ballot_number})? Cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setConfirmVote(false)} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, flex: isMobile ? 1 : "none" }}>Cancel</button>
                <button onClick={handleVote} disabled={loading} style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, opacity: loading ? 0.7 : 1, flex: isMobile ? 1 : "none", justifyContent: "center" }}>
                  {loading ? "Submitting..." : "🗳️ Cast Vote"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View-only candidates */}
      {(!voteResult && (election.status !== "voting" || myStatus?.has_voted || !myStatus?.is_registered)) && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>👤</span> Candidates</div>
          {election.status === "voting" && !myStatus?.is_registered && (
            <Alert type="warning">Register above to unlock voting.</Alert>
          )}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {election.candidates?.map(c => (
              <div key={c.id} style={{ background: colors.cardAlt, borderRadius: 12, padding: 16, border: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `linear-gradient(135deg, ${colors.accent}, ${colors.cardAlt})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: colors.white, flexShrink: 0 }}>{c.ballot_number}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: colors.white, fontSize: 14 }}>{c.full_name}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>{c.position}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: colors.textDim, margin: 0, lineHeight: 1.5 }}>{c.manifesto_summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results?.results && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>📊</span> Election Results</div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
            {results.source === "blockchain" ? "🔗 Blockchain Verified" : "🗄️ Database"}
          </div>

          {results.winner && !results.winner.tie && (
            <div
              onClick={() => setShowFireworks(true)}
              style={{
                cursor: "pointer", textAlign: "center", padding: "20px 16px", marginBottom: 20,
                borderRadius: 14, border: `2px solid ${colors.gold}`,
                background: `linear-gradient(135deg, ${colors.gold}22, ${colors.accent}15)`,
                position: "relative", overflow: "hidden",
              }}
              title="Tap to celebrate!"
            >
              <div style={{ fontSize: 34, marginBottom: 6 }}>🏆</div>
              <div style={{ fontSize: 11, color: colors.gold, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>Winner</div>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: colors.white }}>{results.winner.name}</div>
              <div style={{ fontSize: 13, color: colors.textDim, marginTop: 4 }}>
                {results.winner.vote_count} votes · {totalVotesResult > 0 ? Math.round(results.winner.vote_count / totalVotesResult * 100) : 0}% of ballots cast
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 10, fontStyle: "italic" }}>🎉 Tap to celebrate</div>
            </div>
          )}

          {results.winner?.tie && (
            <Alert type="warning">
              🤝 It's a tie between {results.winner.candidates.map(c => c.name).join(" and ")}, each with {results.winner.candidates[0].vote_count} votes.
            </Alert>
          )}

          {results.results.slice().sort((a, b) => b.vote_count - a.vote_count).map((r, i) => (
            <div key={r.candidate_id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontWeight: 600, color: i === 0 ? colors.accent : colors.text, fontSize: 14 }}>
                  {i === 0 && "🏆 "}{r.name}
                </span>
                <span style={{ fontWeight: 700, color: colors.white, fontSize: 13 }}>
                  {r.vote_count} votes ({totalVotesResult > 0 ? Math.round(r.vote_count / totalVotesResult * 100) : 0}%)
                </span>
              </div>
              <div style={{ height: 9, background: colors.cardAlt, borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, background: i === 0 ? `linear-gradient(90deg, ${colors.warning}, #e8b82a)` : `linear-gradient(90deg, ${colors.accentDim}, ${colors.accent})`, width: `${totalVotesResult > 0 ? (r.vote_count / totalVotesResult * 100) : 0}%`, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showFireworks && <Fireworks onDone={() => setShowFireworks(false)} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ELECTIONS LIST
// ═══════════════════════════════════════════════════════════════
const ElectionsList = ({ setView, setSelectedElection }) => {
  const isMobile = useIsMobile();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const container = { maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" };

  useEffect(() => {
    api.get("/voting/elections/").then(setElections).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div style={container}>
      <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: colors.white, margin: "0 0 20px" }}>Elections</h1>
      {elections.length === 0 && <Alert type="info">No elections available yet.</Alert>}
      {elections.map(e => (
        <div key={e.id} style={{ ...baseStyles.card, cursor: "pointer" }}
          onClick={() => { setSelectedElection(e); setView("election-detail"); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: colors.white, margin: 0 }}>{e.title}</h3>
            <span style={{ color: colors.accent, fontSize: 18, flexShrink: 0 }}>→</span>
          </div>
          <p style={{ fontSize: 13, color: colors.textDim, margin: "0 0 10px" }}>{e.description?.substring(0, 120)}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <StatusBadge status={e.status} />
            <span style={{ fontSize: 12, color: colors.textMuted }}>👤 {e.candidates?.length}</span>
            <span style={{ fontSize: 12, color: colors.textMuted }}>👥 {e.total_voters}</span>
            <span style={{ fontSize: 12, color: colors.textMuted }}>🗳️ {e.total_votes}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// VERIFY VOTE
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// REGISTERED VOTERS LIST (admin drill-down from an election)
// ═══════════════════════════════════════════════════════════════
const RegisteredVotersList = ({ election, setView }) => {
  const isMobile = useIsMobile();
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const container = { maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" };

  useEffect(() => {
    if (!election) return;
    api.get(`/voting/elections/${election.id}/registrations/`)
      .then(setRegs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [election]);

  if (!election) return <LoadingSpinner />;

  const filtered = regs.filter(r =>
    r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={container}>
      <button onClick={() => setView("admin")} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, marginBottom: 16, fontSize: 13 }}>← Back to Admin Panel</button>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: colors.white, margin: 0 }}>Registered Voters</h1>
        <p style={{ color: colors.textMuted, margin: "4px 0 0", fontSize: 13 }}>{election.title}</p>
      </div>

      {loading ? <LoadingSpinner /> : error ? <Alert type="error">{error}</Alert> : (
        <div style={baseStyles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={baseStyles.cardHeader}><span>👥</span> {regs.length} Registered</div>
            <input
              placeholder="Search by name or student ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...baseStyles.input, maxWidth: isMobile ? "100%" : 280 }}
            />
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: colors.textMuted, textAlign: "center", padding: 24 }}>
              {regs.length === 0 ? "No voters have registered for this election yet." : "No matches found."}
            </p>
          ) : isMobile ? (
            filtered.map((r, i) => (
              <div key={r.id || i} style={{ background: colors.cardAlt, borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${colors.border}` }}>
                <div style={{ fontWeight: 600, color: colors.white, fontSize: 14 }}>{r.user_name}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: "monospace" }}>{r.student_id}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Registered {new Date(r.registered_at).toLocaleString()}</div>
              </div>
            ))
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {["#", "Student ID", "Name", "Registered At"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: `1px solid ${colors.border}22` }}>
                      <td style={{ padding: "10px 12px", color: colors.textMuted, fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: colors.text }}>{r.student_id}</td>
                      <td style={{ padding: "10px 12px", color: colors.white, fontWeight: 500 }}>{r.user_name}</td>
                      <td style={{ padding: "10px 12px", color: colors.textDim, fontSize: 13 }}>{new Date(r.registered_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VerifyVote = () => {
  const isMobile = useIsMobile();
  const [hash, setHash] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const container = { maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" };

  const verify = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true); setResult(null);
    try { const r = await api.post("/voting/verify/", { transaction_hash: hash.trim() }); setResult(r); }
    catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={container}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>🔍</div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: colors.white, margin: 0 }}>Verify Your Vote</h1>
          <p style={{ color: colors.textDim, margin: "8px 0 0", fontSize: 13 }}>Enter your transaction hash to verify your vote was recorded on the blockchain</p>
        </div>

        <div style={baseStyles.card}>
          <form onSubmit={verify}>
            <label style={baseStyles.label}>Transaction Hash</label>
            <input style={{ ...baseStyles.input, fontFamily: "monospace", fontSize: 12 }} placeholder="0x..." value={hash} onChange={e => setHash(e.target.value)} />
            <button type="submit" disabled={loading}
              style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: "100%", justifyContent: "center", marginTop: 14, padding: 14 }}>
              {loading ? "Verifying..." : "🔍 Verify Vote"}
            </button>
          </form>

          {result && !result.error && (
            <div style={{ marginTop: 20, padding: 16, background: colors.cardAlt, borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.white, marginBottom: 14, marginTop: 0 }}>Verification Results</h3>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${colors.border}22`, alignItems: "center" }}>
                <span style={{ color: colors.textMuted, fontSize: 13 }}>Database Record</span>
                <span style={baseStyles.badge(result.database_verified ? colors.accent : colors.danger)}>
                  {result.database_verified ? "✅ Verified" : "❌ Not Found"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${colors.border}22`, alignItems: "center" }}>
                <span style={{ color: colors.textMuted, fontSize: 13 }}>Blockchain Record</span>
                <span style={baseStyles.badge(result.blockchain_verified ? colors.accent : colors.warning)}>
                  {result.blockchain_verified ? "✅ On-Chain" : "⚠️ Simulated"}
                </span>
              </div>
              {result.timestamp && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", flexWrap: "wrap", gap: 4 }}>
                  <span style={{ color: colors.textMuted, fontSize: 13 }}>Timestamp</span>
                  <span style={{ color: colors.text, fontSize: 13 }}>{new Date(result.timestamp).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
          {result?.error && <Alert type="error">{result.error}</Alert>}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════
const AdminPanel = ({ setView, setSelectedElection }) => {
  const isMobile = useIsMobile();
  const [elections, setElections] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newElection, setNewElection] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState("elections");
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const container = { maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" };

  const loadData = async () => {
    try {
      const e = await api.get("/voting/elections/");
      setElections(e);
      if (activeTab === "audit") { const a = await api.get("/accounts/audit-logs/"); setAuditLogs(a.results || a); }
      if (activeTab === "users") { const u = await api.get("/accounts/users/"); setUsers(u.results || u); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  const createElection = async (e) => {
    e.preventDefault();
    try {
      await api.post("/voting/elections/", newElection);
      setShowCreate(false); setNewElection({ title: "", description: "" });
      setMsg("Election created!"); await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
  };

  const transitionPhase = async (electionId, action) => {
    try {
      await api.post(`/voting/elections/${electionId}/phase/${action}/`, {});
      setMsg(`Election phase updated: ${action}`); await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
  };

  const addCandidate = async (electionId) => {
    const name = prompt("Candidate full name:");
    if (!name) return;
    const position = prompt("Position (e.g. President):");
    const manifesto = prompt("Manifesto summary:");
    const ballot = prompt("Ballot number:");
    try {
      await api.post(`/voting/elections/${electionId}/candidates/`, {
        full_name: name, position: position || "President",
        manifesto_summary: manifesto || "", ballot_number: parseInt(ballot) || 1,
      });
      setMsg("Candidate added!"); await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
  };

  const openUser = (u) => {
    setSelectedUser(u);
    setEditForm({ full_name: u.full_name, email: u.email, faculty: u.faculty || "", department: u.department || "" });
  };

  const closeUserModal = () => { setSelectedUser(null); setEditForm(null); };

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    setUserActionLoading(true);
    try {
      await api.patch(`/accounts/users/${selectedUser.id}/`, editForm);
      setMsg("User details updated!");
      closeUserModal();
      await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
    finally { setUserActionLoading(false); }
  };

  const toggleEligibility = async (u) => {
    setUserActionLoading(true);
    try {
      await api.patch(`/accounts/users/${u.id}/`, { is_eligible: !u.is_eligible });
      setMsg(u.is_eligible ? "Voter eligibility revoked." : "Voter marked eligible!");
      if (selectedUser?.id === u.id) setSelectedUser({ ...u, is_eligible: !u.is_eligible });
      await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
    finally { setUserActionLoading(false); }
  };

  const markEligible = (studentIdOrUser) => {
    // Back-compat wrapper: accepts either a full user object or just a student_id
    const u = typeof studentIdOrUser === "string" ? users.find(x => x.student_id === studentIdOrUser) : studentIdOrUser;
    if (u) toggleEligibility(u);
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Permanently delete ${u.full_name} (${u.student_id})? This cannot be undone.`)) return;
    setUserActionLoading(true);
    try {
      await api.del(`/accounts/users/${u.id}/`);
      setMsg(`${u.full_name} deleted.`);
      closeUserModal();
      await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
    finally { setUserActionLoading(false); }
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { key: "elections", label: "Elections", icon: "🗳️" },
    { key: "users", label: "Users", icon: "👥" },
    { key: "audit", label: "Audit Log", icon: "📋" },
  ];

  return (
    <div style={container}>
      <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: colors.white, margin: "0 0 20px" }}>Admin Panel</h1>

      {msg && <Alert type={msg.startsWith("Error") ? "error" : "success"}>{msg}</Alert>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: colors.card, borderRadius: 10, padding: 4, border: `1px solid ${colors.border}` }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ ...baseStyles.btn, flex: 1, justifyContent: "center", background: activeTab === t.key ? colors.accent : "transparent", color: activeTab === t.key ? colors.white : colors.textDim, borderRadius: 8, fontSize: isMobile ? 12 : 14, padding: isMobile ? "8px 4px" : "10px 18px" }}>
            <span>{t.icon}</span> {!isMobile && t.label}
            {isMobile && <span style={{ fontSize: 10 }}>{t.label}</span>}
          </button>
        ))}
      </div>

      {activeTab === "elections" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button onClick={() => setShowCreate(!showCreate)} style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: isMobile ? "100%" : "auto", justifyContent: "center" }}>+ New Election</button>
          </div>

          {showCreate && (
            <div style={baseStyles.card}>
              <h3 style={{ color: colors.white, marginTop: 0, fontSize: 16 }}>Create Election</h3>
              <form onSubmit={createElection}>
                <div style={{ marginBottom: 14 }}>
                  <label style={baseStyles.label}>Title</label>
                  <input style={baseStyles.input} value={newElection.title} onChange={e => setNewElection(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={baseStyles.label}>Description</label>
                  <textarea style={{ ...baseStyles.input, minHeight: 70, resize: "vertical" }} value={newElection.description} onChange={e => setNewElection(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="submit" style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, flex: isMobile ? 1 : "none", justifyContent: "center" }}>Create</button>
                  <button type="button" onClick={() => setShowCreate(false)} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, flex: isMobile ? 1 : "none", justifyContent: "center" }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {elections.map(e => (
            <div key={e.id} style={baseStyles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.white, margin: "0 0 4px" }}>{e.title}</h3>
                  <span style={{ fontSize: 12, color: colors.textMuted }}>
                    📊 {e.total_votes} votes ·{" "}
                    <span
                      onClick={() => { setSelectedElection(e); setView("voter-list"); }}
                      style={{ color: colors.accent, textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                    >
                      👥 {e.total_voters} registered
                    </span>
                  </span>
                </div>
                <StatusBadge status={e.status} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {e.status === "not_started" && (
                  <>
                    <button onClick={() => addCandidate(e.id)} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, fontSize: 12 }}>+ Add Candidate</button>
                    <button onClick={() => transitionPhase(e.id, "start_registration")} style={{ ...baseStyles.btn, ...baseStyles.btnBlue, fontSize: 12 }}>Open Registration</button>
                  </>
                )}
                {e.status === "registration" && (
                  <>
                    <button onClick={() => addCandidate(e.id)} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, fontSize: 12 }}>+ Add Candidate</button>
                    <button onClick={() => transitionPhase(e.id, "open_polls")} style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, fontSize: 12 }}>Open Polls</button>
                  </>
                )}
                {e.status === "voting" && (
                  <button onClick={() => transitionPhase(e.id, "close_polls")} style={{ ...baseStyles.btn, ...baseStyles.btnDanger, fontSize: 12 }}>Close Polls</button>
                )}
                {e.status === "ended" && (
                  <button onClick={() => transitionPhase(e.id, "publish_results")} style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, fontSize: 12 }}>📊 Publish Results</button>
                )}
                <button onClick={() => { setSelectedElection(e); setView("election-detail"); }}
                  style={{ ...baseStyles.btn, ...baseStyles.btnOutline, fontSize: 12 }}>View →</button>
              </div>
              {e.candidates?.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}22` }}>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>Candidates:</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {e.candidates.map(c => (
                      <span key={c.id} style={{ ...baseStyles.badge(colors.accent), fontSize: 11 }}>#{c.ballot_number} {c.full_name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {activeTab === "users" && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>👥</span> Registered Users</div>
          <p style={{ fontSize: 12, color: colors.textMuted, marginTop: -8, marginBottom: 14 }}>Click any user to view, edit, mark eligible, or delete.</p>
          {isMobile ? (
            (Array.isArray(users) ? users : []).map(u => (
              <div key={u.id} onClick={() => openUser(u)}
                style={{ background: colors.cardAlt, borderRadius: 10, padding: 12, marginBottom: 10, cursor: "pointer", border: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: colors.white, fontSize: 14 }}>{u.full_name}</span>
                  <span style={baseStyles.badge(u.role === "admin" ? colors.purple : u.role === "sysadmin" ? colors.danger : colors.accent)}>{u.role}</span>
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted, fontFamily: "monospace" }}>{u.student_id}</div>
                <div style={{ fontSize: 12, color: colors.textDim }}>{u.email}</div>
                <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>{u.faculty} · {u.is_eligible ? "✅ Eligible" : "—"}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {u.role === "voter" && (
                    <button onClick={(e) => { e.stopPropagation(); toggleEligibility(u); }}
                      style={{ ...baseStyles.btn, ...(u.is_eligible ? baseStyles.btnOutline : baseStyles.btnPrimary), fontSize: 11, flex: 1, justifyContent: "center", padding: "6px 8px" }}>
                      {u.is_eligible ? "Revoke" : "✅ Mark Eligible"}
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); openUser(u); }}
                    style={{ ...baseStyles.btn, ...baseStyles.btnOutline, fontSize: 11, padding: "6px 8px" }}>
                    ⚙️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {["Student ID", "Name", "Email", "Role", "Faculty", "Eligible", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(users) ? users : []).map(u => (
                    <tr key={u.id} onClick={() => openUser(u)}
                      style={{ borderBottom: `1px solid ${colors.border}22`, cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${colors.accent}0a`}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: colors.text }}>{u.student_id}</td>
                      <td style={{ padding: "10px 12px", color: colors.white, fontWeight: 500 }}>{u.full_name}</td>
                      <td style={{ padding: "10px 12px", color: colors.textDim, fontSize: 13 }}>{u.email}</td>
                      <td style={{ padding: "10px 12px" }}><span style={baseStyles.badge(u.role === "admin" ? colors.purple : u.role === "sysadmin" ? colors.danger : colors.accent)}>{u.role}</span></td>
                      <td style={{ padding: "10px 12px", color: colors.textDim, fontSize: 13 }}>{u.faculty}</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: u.is_eligible ? colors.accent : colors.textMuted }}>{u.is_eligible ? "✅" : "—"}</span></td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {u.role === "voter" && (
                            <button onClick={(e) => { e.stopPropagation(); toggleEligibility(u); }}
                              style={{ ...baseStyles.btn, ...(u.is_eligible ? baseStyles.btnOutline : baseStyles.btnPrimary), fontSize: 11, padding: "6px 10px" }}>
                              {u.is_eligible ? "Revoke" : "Mark Eligible"}
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); openUser(u); }}
                            style={{ ...baseStyles.btn, ...baseStyles.btnOutline, fontSize: 11, padding: "6px 10px" }}>
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Detail / Edit Modal */}
      {selectedUser && editForm && (
        <div onClick={closeUserModal} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: colors.card, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ color: colors.white, margin: 0, fontSize: 18 }}>Manage User</h3>
              <button onClick={closeUserModal} style={{ background: "transparent", border: "none", color: colors.textMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: colors.textMuted }}>{selectedUser.student_id}</span>
              <span style={baseStyles.badge(selectedUser.role === "admin" ? colors.purple : selectedUser.role === "sysadmin" ? colors.danger : colors.accent)}>{selectedUser.role}</span>
              <span style={baseStyles.badge(selectedUser.is_eligible ? colors.accent : colors.textMuted)}>{selectedUser.is_eligible ? "✅ Eligible" : "Not Eligible"}</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={baseStyles.label}>Full Name</label>
              <input style={baseStyles.input} value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={baseStyles.label}>Email</label>
              <input style={baseStyles.input} type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div>
                <label style={baseStyles.label}>Faculty</label>
                <input style={baseStyles.input} value={editForm.faculty} onChange={e => setEditForm(f => ({ ...f, faculty: e.target.value }))} />
              </div>
              <div>
                <label style={baseStyles.label}>Department</label>
                <input style={baseStyles.input} value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>

            <button onClick={saveUserEdits} disabled={userActionLoading}
              style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: "100%", justifyContent: "center", marginBottom: 10, opacity: userActionLoading ? 0.7 : 1 }}>
              {userActionLoading ? "Saving..." : "💾 Save Changes"}
            </button>

            {selectedUser.role === "voter" && (
              <button onClick={() => toggleEligibility(selectedUser)} disabled={userActionLoading}
                style={{ ...baseStyles.btn, ...(selectedUser.is_eligible ? baseStyles.btnOutline : baseStyles.btnBlue), width: "100%", justifyContent: "center", marginBottom: 10, opacity: userActionLoading ? 0.7 : 1 }}>
                {selectedUser.is_eligible ? "🚫 Revoke Eligibility" : "✅ Mark Eligible"}
              </button>
            )}

            <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 8, paddingTop: 14 }}>
              <button onClick={() => deleteUser(selectedUser)} disabled={userActionLoading}
                style={{ ...baseStyles.btn, ...baseStyles.btnDanger, width: "100%", justifyContent: "center", opacity: userActionLoading ? 0.7 : 1 }}>
                🗑️ Delete User Permanently
              </button>
              <p style={{ fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: 8, marginBottom: 0 }}>
                This cannot be undone. Vote records are preserved and anonymised, not deleted.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>📋</span> Audit Trail</div>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {(Array.isArray(auditLogs) ? auditLogs : []).map(log => (
              <div key={log.id} style={{ padding: "12px 0", borderBottom: `1px solid ${colors.border}22` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                  <div style={{ minWidth: isMobile ? "100%" : 140, marginBottom: isMobile ? 4 : 0 }}>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>{new Date(log.created_at).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted }}>{log.ip_address}</div>
                  </div>
                  <div>
                    <span style={baseStyles.badge(colors.accent)}>{log.action}</span>
                    <div style={{ fontSize: 13, color: colors.textDim, marginTop: 4 }}>{log.details}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>{log.actor_name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SYSTEM ADMIN
// ═══════════════════════════════════════════════════════════════
const SystemPanel = () => {
  const isMobile = useIsMobile();
  const [health, setHealth] = useState(null);
  const container = { maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 24px" };

  useEffect(() => {
    api.get("/accounts/system-health/").then(setHealth).catch(() => setHealth({ error: true }));
  }, []);

  return (
    <div style={container}>
      <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: colors.white, margin: "0 0 20px" }}>System Administration</h1>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>🗄️</span> Database</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: health?.database === "connected" ? colors.accent : colors.danger, flexShrink: 0 }} />
            <span style={{ color: colors.text, fontSize: 13 }}>{health?.database || "checking..."}</span>
          </div>
        </div>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>🔗</span> Blockchain</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors.warning, flexShrink: 0 }} />
            <span style={{ color: colors.text, fontSize: 13 }}>Ganache (Local Dev)</span>
          </div>
          <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 8, marginBottom: 0 }}>Connect Ganache on port 8545 for full blockchain features</p>
        </div>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>⚡</span> System Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: health?.status === "operational" ? colors.accent : colors.danger, flexShrink: 0 }} />
            <span style={{ color: colors.text, fontSize: 13 }}>{health?.status || "checking..."}</span>
          </div>
        </div>
      </div>

      <div style={baseStyles.card}>
        <div style={baseStyles.cardHeader}><span>📖</span> System Information</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            ["Backend Framework", "Django 5.x (Python)"],
            ["Frontend Framework", "React.js"],
            ["Database", "PostgreSQL (Supabase)"],
            ["Blockchain Platform", "Ethereum (Ganache local)"],
            ["Smart Contract Language", "Solidity ^0.8.19"],
            ["Authentication", "JWT (JSON Web Tokens)"],
            ["API Architecture", "REST API (Django REST Framework)"],
            ["Blockchain Library", "Web3.py"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: colors.cardAlt, borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap", gap: 4 }}>
              <span style={{ color: colors.textMuted, fontSize: 13 }}>{k}</span>
              <span style={{ color: colors.text, fontSize: 13, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
const AppContent = () => {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const [selectedElection, setSelectedElection] = useState(null);

  if (!user) return <LoginPage />;

  const renderView = () => {
    switch (view) {
      case "dashboard": return <Dashboard setView={setView} setSelectedElection={setSelectedElection} />;
      case "elections": return <ElectionsList setView={setView} setSelectedElection={setSelectedElection} />;
      case "election-detail": return selectedElection ? <ElectionDetail election={selectedElection} setView={setView} setSelectedElection={setSelectedElection} /> : <ElectionsList setView={setView} setSelectedElection={setSelectedElection} />;
      case "voter-list": return <RegisteredVotersList election={selectedElection} setView={setView} />;
      case "verify": return <VerifyVote />;
      case "admin": return <AdminPanel setView={setView} setSelectedElection={setSelectedElection} />;
      case "system": return <SystemPanel />;
      default: return <Dashboard setView={setView} setSelectedElection={setSelectedElection} />;
    }
  };

  return (
    <div style={baseStyles.page}>
      <Navbar currentView={view} setView={setView} />
      {renderView()}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <style>{`
        html, body { overflow-x: hidden; max-width: 100vw; margin: 0; padding: 0; }
        * { box-sizing: border-box; }
      `}</style>
      <AppContent />
    </AuthProvider>
  );
}