import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ═══════════════════════════════════════════════════════════════
// API SERVICE LAYER
// ═══════════════════════════════════════════════════════════════
const API_BASE = "http://localhost:8000/api";

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

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const colors = {
  bg: "#0a0e17",
  card: "#111827",
  cardAlt: "#1a2236",
  border: "#1e293b",
  accent: "#10b981",
  accentDim: "#065f46",
  accentBright: "#34d399",
  danger: "#ef4444",
  warning: "#f59e0b",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  textMuted: "#64748b",
  white: "#ffffff",
};

const font = "'Segoe UI', system-ui, -apple-system, sans-serif";

const baseStyles = {
  page: { minHeight: "100vh", background: `linear-gradient(135deg, ${colors.bg} 0%, #0f172a 50%, #1a1a2e 100%)`, fontFamily: font, color: colors.text, padding: 0, margin: 0 },
  container: { maxWidth: 1200, margin: "0 auto", padding: "20px 24px" },
  card: { background: colors.card, borderRadius: 16, border: `1px solid ${colors.border}`, padding: 28, marginBottom: 20, backdropFilter: "blur(10px)" },
  cardHeader: { fontSize: 18, fontWeight: 700, color: colors.white, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 },
  btn: { padding: "12px 24px", borderRadius: 10, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s", fontFamily: font, display: "inline-flex", alignItems: "center", gap: 8 },
  btnPrimary: { background: `linear-gradient(135deg, ${colors.accent}, #059669)`, color: colors.white },
  btnDanger: { background: `linear-gradient(135deg, ${colors.danger}, #dc2626)`, color: colors.white },
  btnOutline: { background: "transparent", border: `1px solid ${colors.border}`, color: colors.textDim },
  btnBlue: { background: `linear-gradient(135deg, ${colors.blue}, #2563eb)`, color: colors.white },
  input: { width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.cardAlt, color: colors.text, fontSize: 14, fontFamily: font, outline: "none", boxSizing: "border-box" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: colors.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" },
  badge: (color) => ({ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${color}22`, color: color, border: `1px solid ${color}44` }),
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }),
  stat: { textAlign: "center", padding: 20 },
  statNum: { fontSize: 32, fontWeight: 800, background: `linear-gradient(135deg, ${colors.accent}, ${colors.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  statLabel: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
};

// ═══════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════
const StatusBadge = ({ status }) => {
  const map = {
    not_started: { color: colors.textMuted, label: "Not Started" },
    registration: { color: colors.blue, label: "Registration Open" },
    voting: { color: colors.accent, label: "Voting Open" },
    ended: { color: colors.warning, label: "Ended" },
    results_published: { color: colors.purple, label: "Results Published" },
  };
  const s = map[status] || { color: colors.textMuted, label: status };
  return <span style={baseStyles.badge(s.color)}>{s.label}</span>;
};

const LoadingSpinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 40, height: 40, border: `3px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Alert = ({ type = "info", children }) => {
  const c = { success: colors.accent, error: colors.danger, warning: colors.warning, info: colors.blue }[type];
  return (
    <div style={{ padding: "14px 18px", borderRadius: 10, background: `${c}15`, border: `1px solid ${c}33`, color: c, fontSize: 14, marginBottom: 16 }}>
      {children}
    </div>
  );
};

const StatCard = ({ icon, value, label }) => (
  <div style={{ ...baseStyles.card, ...baseStyles.stat }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={baseStyles.statNum}>{value}</div>
    <div style={baseStyles.statLabel}>{label}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════
const Navbar = ({ currentView, setView }) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "sysadmin";

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "elections", label: "Elections", icon: "🗳️" },
    { key: "verify", label: "Verify Vote", icon: "🔍" },
  ];
  if (isAdmin) {
    navItems.push({ key: "admin", label: "Admin Panel", icon: "⚙️" });
  }
  if (user?.role === "sysadmin") {
    navItems.push({ key: "system", label: "System", icon: "🖥️" });
  }

  return (
    <nav style={{ background: `${colors.card}ee`, borderBottom: `1px solid ${colors.border}`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${colors.accent}, ${colors.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🗳️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.white, lineHeight: 1 }}>MMU E-Vote</div>
            <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: 1 }}>BLOCKCHAIN SECURED</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setView(item.key)}
              style={{ ...baseStyles.btn, padding: "8px 16px", fontSize: 13, background: currentView === item.key ? `${colors.accent}22` : "transparent", color: currentView === item.key ? colors.accent : colors.textDim, border: currentView === item.key ? `1px solid ${colors.accent}44` : "1px solid transparent", borderRadius: 8 }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{user?.full_name}</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{user?.student_id} · {user?.role}</div>
          </div>
          <button onClick={logout} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, padding: "8px 14px", fontSize: 12 }}>Logout</button>
        </div>
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════
const LoginPage = () => {
  const { login, register, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ student_id: "", password: "", full_name: "", email: "", faculty: "", department: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.student_id, form.password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ ...baseStyles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${colors.accent}08, transparent)` }} />
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${colors.blue}06, transparent)` }} />
      </div>

      <div style={{ width: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${colors.accent}, ${colors.blue})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16, boxShadow: `0 8px 32px ${colors.accent}33` }}>🗳️</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: colors.white, margin: 0 }}>MMU E-Vote</h1>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: "8px 0 0" }}>Smart Contract-Based Voting System</p>
          <p style={{ color: colors.textMuted, fontSize: 12 }}>Multimedia University of Kenya</p>
        </div>

        <div style={baseStyles.card}>
          <div style={{ display: "flex", marginBottom: 24, background: colors.cardAlt, borderRadius: 10, padding: 4 }}>
            <button onClick={() => setIsRegister(false)} style={{ ...baseStyles.btn, flex: 1, justifyContent: "center", background: !isRegister ? colors.accent : "transparent", color: !isRegister ? colors.white : colors.textDim, borderRadius: 8, fontSize: 13 }}>Sign In</button>
            <button onClick={() => setIsRegister(true)} style={{ ...baseStyles.btn, flex: 1, justifyContent: "center", background: isRegister ? colors.accent : "transparent", color: isRegister ? colors.white : colors.textDim, borderRadius: 8, fontSize: 13 }}>Register</button>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={baseStyles.label}>Student ID</label>
              <input style={baseStyles.input} placeholder="e.g. CIT-222-001/2021" value={form.student_id} onChange={set("student_id")} required />
            </div>

            {isRegister && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={baseStyles.label}>Full Name</label>
                  <input style={baseStyles.input} placeholder="Your full name" value={form.full_name} onChange={set("full_name")} required />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={baseStyles.label}>Email</label>
                  <input style={baseStyles.input} type="email" placeholder="your.email@students.mmu.ac.ke" value={form.email} onChange={set("email")} required />
                </div>
                <div style={{ ...baseStyles.grid(2), marginBottom: 16 }}>
                  <div>
                    <label style={baseStyles.label}>Faculty</label>
                    <input style={baseStyles.input} placeholder="e.g. Computing & IT" value={form.faculty} onChange={set("faculty")} />
                  </div>
                  <div>
                    <label style={baseStyles.label}>Department</label>
                    <input style={baseStyles.input} placeholder="e.g. Computer Tech" value={form.department} onChange={set("department")} />
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={baseStyles.label}>Password</label>
              <input style={baseStyles.input} type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required />
            </div>

            <button type="submit" disabled={loading}
              style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: "100%", justifyContent: "center", padding: 14, fontSize: 15, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, padding: "16px 0 0", borderTop: `1px solid ${colors.border}` }}>
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
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, e] = await Promise.all([
          api.get("/voting/dashboard/"),
          api.get("/voting/elections/"),
        ]);
        setStats(s);
        setElections(e);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  const activeElections = elections.filter(e => e.status === "voting" || e.status === "registration");

  return (
    <div style={baseStyles.container}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: colors.white, margin: 0 }}>Welcome back, {user?.full_name?.split(" ")[0]}</h1>
        <p style={{ color: colors.textMuted, margin: "4px 0 0", fontSize: 14 }}>Here's your voting overview</p>
      </div>

      <div style={baseStyles.grid(4)}>
        <StatCard icon="🗳️" value={stats?.total_elections || 0} label="Total Elections" />
        <StatCard icon="🟢" value={stats?.active_elections || 0} label="Active Now" />
        <StatCard icon="👥" value={stats?.total_voters || 0} label="Registered Voters" />
        <StatCard icon="✅" value={stats?.my_votes || 0} label="My Votes Cast" />
      </div>

      {activeElections.length > 0 && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}>
            <span>🔴</span> Active Elections
          </div>
          {activeElections.map(election => (
            <div key={election.id} style={{ background: colors.cardAlt, borderRadius: 12, padding: 20, marginBottom: 12, border: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.white, margin: 0 }}>{election.title}</h3>
                <p style={{ fontSize: 13, color: colors.textDim, margin: "6px 0", maxWidth: 500 }}>{election.description?.substring(0, 120)}...</p>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <StatusBadge status={election.status} />
                  <span style={{ fontSize: 12, color: colors.textMuted }}>📊 {election.total_votes} votes · 👥 {election.total_voters} registered · 🏷️ {election.candidates?.length} candidates</span>
                </div>
              </div>
              <button onClick={() => { setSelectedElection(election); setView("election-detail"); }}
                style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, whiteSpace: "nowrap" }}>
                {election.status === "voting" ? "Vote Now →" : "View →"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={baseStyles.card}>
        <div style={baseStyles.cardHeader}><span>📜</span> All Elections</div>
        {elections.length === 0 ? (
          <p style={{ color: colors.textMuted, textAlign: "center", padding: 20 }}>No elections found</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                  <td style={{ padding: "14px 12px", fontWeight: 600, color: colors.white }}>{e.title}</td>
                  <td style={{ padding: "14px 12px" }}><StatusBadge status={e.status} /></td>
                  <td style={{ padding: "14px 12px", color: colors.textDim }}>{e.candidates?.length || 0}</td>
                  <td style={{ padding: "14px 12px", color: colors.textDim }}>{e.total_voters}</td>
                  <td style={{ padding: "14px 12px", color: colors.textDim }}>{e.total_votes}</td>
                  <td style={{ padding: "14px 12px" }}>
                    <span style={{ color: colors.accent, fontSize: 13 }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ELECTION DETAIL / VOTING
// ═══════════════════════════════════════════════════════════════
const ElectionDetail = ({ election: initialElection, setView }) => {
  const { user } = useAuth();
  const [election, setElection] = useState(initialElection);
  const [myStatus, setMyStatus] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [confirmVote, setConfirmVote] = useState(false);
  const [voteResult, setVoteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  const load = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([
        api.get(`/voting/elections/${election.id}/`),
        api.get(`/voting/elections/${election.id}/my-status/`),
      ]);
      setElection(e);
      setMyStatus(s);
      if (e.status === "ended" || e.status === "results_published") {
        try {
          const r = await api.get(`/voting/elections/${election.id}/results/`);
          setResults(r);
        } catch (err) {}
      }
    } catch (err) { console.error(err); }
  }, [election.id]);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    setLoading(true); setError("");
    try {
      await api.post(`/voting/elections/${election.id}/register/`, {});
      await load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVote = async () => {
    setLoading(true); setError("");
    try {
      const result = await api.post(`/voting/elections/${election.id}/vote/`, { candidate_id: selectedCandidate.ballot_number });
      setVoteResult(result);
      setConfirmVote(false);
      await load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const totalVotesResult = results?.results?.reduce((s, r) => s + r.vote_count, 0) || results?.total_votes || 0;

  return (
    <div style={baseStyles.container}>
      <button onClick={() => setView("elections")} style={{ ...baseStyles.btn, ...baseStyles.btnOutline, marginBottom: 20, fontSize: 13 }}>← Back to Elections</button>

      <div style={baseStyles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.white, margin: 0 }}>{election.title}</h1>
            <p style={{ color: colors.textDim, margin: "8px 0", fontSize: 14 }}>{election.description}</p>
          </div>
          <StatusBadge status={election.status} />
        </div>

        <div style={{ ...baseStyles.grid(4), marginTop: 20, padding: "16px 0", borderTop: `1px solid ${colors.border}` }}>
          <div style={baseStyles.stat}>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.accent }}>{election.candidates?.length || 0}</div>
            <div style={baseStyles.statLabel}>Candidates</div>
          </div>
          <div style={baseStyles.stat}>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.blue }}>{election.total_voters}</div>
            <div style={baseStyles.statLabel}>Registered</div>
          </div>
          <div style={baseStyles.stat}>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.purple }}>{election.total_votes}</div>
            <div style={baseStyles.statLabel}>Votes Cast</div>
          </div>
          <div style={baseStyles.stat}>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.warning }}>
              {election.total_voters > 0 ? Math.round(election.total_votes / election.total_voters * 100) : 0}%
            </div>
            <div style={baseStyles.statLabel}>Turnout</div>
          </div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Voter Status & Actions */}
      {user?.role === "voter" && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>📋</span> Your Voting Status</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <span style={baseStyles.badge(myStatus?.is_registered ? colors.accent : colors.textMuted)}>
              {myStatus?.is_registered ? "✅ Registered" : "⬜ Not Registered"}
            </span>
            <span style={baseStyles.badge(myStatus?.has_voted ? colors.accent : colors.textMuted)}>
              {myStatus?.has_voted ? "✅ Vote Cast" : "⬜ Not Voted"}
            </span>
          </div>

          {election.status === "registration" && !myStatus?.is_registered && (
            <button onClick={handleRegister} disabled={loading}
              style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Registering..." : "Register to Vote"}
            </button>
          )}

          {myStatus?.has_voted && myStatus?.transaction_hash && (
            <Alert type="success">
              Your vote has been recorded! Transaction: <code style={{ fontSize: 12, background: colors.cardAlt, padding: "2px 6px", borderRadius: 4 }}>{myStatus.transaction_hash}</code>
            </Alert>
          )}
        </div>
      )}

      {/* Vote Result */}
      {voteResult && (
        <div style={{ ...baseStyles.card, border: `2px solid ${colors.accent}`, background: `linear-gradient(135deg, ${colors.accentDim}22, ${colors.card})` }}>
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.accent, margin: 0 }}>Vote Cast Successfully!</h2>
            <p style={{ color: colors.textDim, margin: "12px 0" }}>Your vote has been securely recorded on the blockchain</p>
            <div style={{ background: colors.cardAlt, borderRadius: 10, padding: 16, marginTop: 16, fontFamily: "monospace", fontSize: 13, color: colors.text, wordBreak: "break-all" }}>
              <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>TRANSACTION HASH (Your Cryptographic Receipt)</div>
              {voteResult.transaction_hash}
            </div>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 12 }}>Save this hash to verify your vote later using the Verify Vote feature.</p>
          </div>
        </div>
      )}

      {/* Candidates & Voting */}
      {election.status === "voting" && myStatus?.is_registered && !myStatus?.has_voted && !voteResult && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>🗳️</span> Cast Your Vote</div>
          <p style={{ color: colors.textDim, fontSize: 13, marginBottom: 20 }}>Select your preferred candidate and confirm your vote. This action is irreversible.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300, 1fr))", gap: 16 }}>
            {election.candidates?.map(c => (
              <div key={c.id} onClick={() => { setSelectedCandidate(c); setConfirmVote(false); }}
                style={{
                  background: selectedCandidate?.id === c.id ? `${colors.accent}15` : colors.cardAlt,
                  border: `2px solid ${selectedCandidate?.id === c.id ? colors.accent : colors.border}`,
                  borderRadius: 14, padding: 20, cursor: "pointer", transition: "all 0.2s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${[colors.accent, colors.blue, colors.purple, colors.warning][c.ballot_number % 4]}, ${colors.cardAlt})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: colors.white }}>{c.ballot_number}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colors.white }}>{c.full_name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{c.position}</div>
                  </div>
                  {selectedCandidate?.id === c.id && <span style={{ marginLeft: "auto", fontSize: 22 }}>✅</span>}
                </div>
                <p style={{ fontSize: 13, color: colors.textDim, margin: 0, lineHeight: 1.5 }}>{c.manifesto_summary}</p>
              </div>
            ))}
          </div>

          {selectedCandidate && !confirmVote && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button onClick={() => setConfirmVote(true)} style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, padding: "14px 40px", fontSize: 15 }}>
                Confirm Selection: {selectedCandidate.full_name} →
              </button>
            </div>
          )}

          {confirmVote && (
            <div style={{ marginTop: 20, background: `${colors.warning}15`, border: `1px solid ${colors.warning}44`, borderRadius: 12, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
              <h3 style={{ color: colors.warning, margin: "0 0 8px" }}>Confirm Your Vote</h3>
              <p style={{ color: colors.textDim, fontSize: 14 }}>You are about to vote for <strong style={{ color: colors.white }}>{selectedCandidate.full_name}</strong> (#{selectedCandidate.ballot_number}). This action cannot be undone.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
                <button onClick={() => setConfirmVote(false)} style={{ ...baseStyles.btn, ...baseStyles.btnOutline }}>Cancel</button>
                <button onClick={handleVote} disabled={loading}
                  style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Submitting..." : "🗳️ Cast Vote"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Candidates List (non-voting view) */}
      {(election.status !== "voting" || myStatus?.has_voted || !myStatus?.is_registered) && !voteResult && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>👤</span> Candidates</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {election.candidates?.map(c => (
              <div key={c.id} style={{ background: colors.cardAlt, borderRadius: 12, padding: 18, border: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${[colors.accent, colors.blue, colors.purple][c.ballot_number % 3]}, ${colors.cardAlt})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: colors.white }}>{c.ballot_number}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: colors.white }}>{c.full_name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{c.position}</div>
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
          <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>Source: {results.source === "blockchain" ? "🔗 Blockchain Verified" : "🗄️ Database"}</div>
          {results.results.sort((a, b) => b.vote_count - a.vote_count).map((r, i) => (
            <div key={r.candidate_id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: i === 0 ? colors.accent : colors.text }}>
                  {i === 0 && "🏆 "}{r.name}
                </span>
                <span style={{ fontWeight: 700, color: colors.white }}>{r.vote_count} votes ({totalVotesResult > 0 ? Math.round(r.vote_count / totalVotesResult * 100) : 0}%)</span>
              </div>
              <div style={{ height: 10, background: colors.cardAlt, borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, background: i === 0 ? `linear-gradient(90deg, ${colors.accent}, ${colors.accentBright})` : `linear-gradient(90deg, ${colors.blue}, ${colors.purple})`, width: `${totalVotesResult > 0 ? (r.vote_count / totalVotesResult * 100) : 0}%`, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ELECTIONS LIST
// ═══════════════════════════════════════════════════════════════
const ElectionsList = ({ setView, setSelectedElection }) => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/voting/elections/").then(setElections).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div style={baseStyles.container}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: colors.white, margin: "0 0 24px" }}>Elections</h1>
      {elections.length === 0 && <Alert type="info">No elections available yet.</Alert>}
      {elections.map(e => (
        <div key={e.id} style={{ ...baseStyles.card, cursor: "pointer", transition: "border-color 0.2s" }}
          onClick={() => { setSelectedElection(e); setView("election-detail"); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.white, margin: 0 }}>{e.title}</h3>
              <p style={{ fontSize: 13, color: colors.textDim, margin: "6px 0 12px" }}>{e.description?.substring(0, 150)}</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <StatusBadge status={e.status} />
                <span style={{ fontSize: 12, color: colors.textMuted }}>👤 {e.candidates?.length} candidates</span>
                <span style={{ fontSize: 12, color: colors.textMuted }}>👥 {e.total_voters} registered</span>
                <span style={{ fontSize: 12, color: colors.textMuted }}>🗳️ {e.total_votes} votes</span>
              </div>
            </div>
            <span style={{ color: colors.accent, fontSize: 20, marginLeft: 16 }}>→</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// VERIFY VOTE
// ═══════════════════════════════════════════════════════════════
const VerifyVote = () => {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await api.post("/voting/verify/", { transaction_hash: hash.trim() });
      setResult(r);
    } catch (err) {
      setResult({ error: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div style={baseStyles.container}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: colors.white, margin: 0 }}>Verify Your Vote</h1>
          <p style={{ color: colors.textDim, margin: "8px 0 0" }}>Enter your transaction hash to verify your vote was recorded on the blockchain</p>
        </div>

        <div style={baseStyles.card}>
          <form onSubmit={verify}>
            <label style={baseStyles.label}>Transaction Hash</label>
            <input style={{ ...baseStyles.input, fontFamily: "monospace", fontSize: 13 }} placeholder="0x..." value={hash} onChange={e => setHash(e.target.value)} />
            <button type="submit" disabled={loading}
              style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, width: "100%", justifyContent: "center", marginTop: 16, padding: 14 }}>
              {loading ? "Verifying..." : "🔍 Verify Vote"}
            </button>
          </form>

          {result && !result.error && (
            <div style={{ marginTop: 24, padding: 20, background: colors.cardAlt, borderRadius: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.white, marginBottom: 16 }}>Verification Results</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${colors.border}22` }}>
                  <span style={{ color: colors.textMuted }}>Database Record</span>
                  <span style={baseStyles.badge(result.database_verified ? colors.accent : colors.danger)}>
                    {result.database_verified ? "✅ Verified" : "❌ Not Found"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${colors.border}22` }}>
                  <span style={{ color: colors.textMuted }}>Blockchain Record</span>
                  <span style={baseStyles.badge(result.blockchain_verified ? colors.accent : colors.warning)}>
                    {result.blockchain_verified ? "✅ On-Chain" : "⚠️ Not on chain (may be simulated)"}
                  </span>
                </div>
                {result.timestamp && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                    <span style={{ color: colors.textMuted }}>Timestamp</span>
                    <span style={{ color: colors.text }}>{new Date(result.timestamp).toLocaleString()}</span>
                  </div>
                )}
              </div>
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
  const { user } = useAuth();
  const [elections, setElections] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newElection, setNewElection] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState("elections");
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);

  const loadData = async () => {
    try {
      const e = await api.get("/voting/elections/");
      setElections(e);
      if (activeTab === "audit") {
        const a = await api.get("/accounts/audit-logs/");
        setAuditLogs(a.results || a);
      }
      if (activeTab === "users") {
        const u = await api.get("/accounts/users/");
        setUsers(u.results || u);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  const createElection = async (e) => {
    e.preventDefault();
    try {
      await api.post("/voting/elections/", newElection);
      setShowCreate(false);
      setNewElection({ title: "", description: "" });
      setMsg("Election created successfully!");
      await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
  };

  const transitionPhase = async (electionId, action) => {
    try {
      await api.post(`/voting/elections/${electionId}/phase/${action}/`, {});
      setMsg(`Election phase updated: ${action}`);
      await loadData();
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
      setMsg("Candidate added!");
      await loadData();
    } catch (err) { setMsg("Error: " + err.message); }
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { key: "elections", label: "Elections", icon: "🗳️" },
    { key: "users", label: "Users", icon: "👥" },
    { key: "audit", label: "Audit Log", icon: "📋" },
  ];

  return (
    <div style={baseStyles.container}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: colors.white, margin: "0 0 24px" }}>Admin Panel</h1>

      {msg && <Alert type={msg.startsWith("Error") ? "error" : "success"}>{msg}</Alert>}

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: colors.card, borderRadius: 10, padding: 4, border: `1px solid ${colors.border}` }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ ...baseStyles.btn, flex: 1, justifyContent: "center", background: activeTab === t.key ? colors.accent : "transparent", color: activeTab === t.key ? colors.white : colors.textDim, borderRadius: 8 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "elections" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={() => setShowCreate(!showCreate)} style={{ ...baseStyles.btn, ...baseStyles.btnPrimary }}>+ New Election</button>
          </div>

          {showCreate && (
            <div style={baseStyles.card}>
              <h3 style={{ color: colors.white, marginTop: 0 }}>Create Election</h3>
              <form onSubmit={createElection}>
                <div style={{ marginBottom: 16 }}>
                  <label style={baseStyles.label}>Title</label>
                  <input style={baseStyles.input} value={newElection.title} onChange={e => setNewElection(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={baseStyles.label}>Description</label>
                  <textarea style={{ ...baseStyles.input, minHeight: 80, resize: "vertical" }} value={newElection.description} onChange={e => setNewElection(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" style={{ ...baseStyles.btn, ...baseStyles.btnPrimary }}>Create</button>
                  <button type="button" onClick={() => setShowCreate(false)} style={{ ...baseStyles.btn, ...baseStyles.btnOutline }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {elections.map(e => (
            <div key={e.id} style={baseStyles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.white, margin: 0 }}>{e.title}</h3>
                  <span style={{ fontSize: 12, color: colors.textMuted }}>📊 {e.total_votes} votes · 👥 {e.total_voters} registered</span>
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
                  style={{ ...baseStyles.btn, ...baseStyles.btnOutline, fontSize: 12 }}>View Details →</button>
              </div>
              {e.candidates?.length > 0 && (
                <div style={{ marginTop: 12, padding: "12px 0 0", borderTop: `1px solid ${colors.border}22` }}>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Candidates:</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {e.candidates.map(c => (
                      <span key={c.id} style={{ ...baseStyles.badge(colors.blue), fontSize: 12 }}>#{c.ballot_number} {c.full_name}</span>
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {["Student ID", "Name", "Email", "Role", "Faculty", "Eligible"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(users) ? users : []).map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}22` }}>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 13, color: colors.text }}>{u.student_id}</td>
                  <td style={{ padding: "10px 12px", color: colors.white, fontWeight: 500 }}>{u.full_name}</td>
                  <td style={{ padding: "10px 12px", color: colors.textDim, fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: "10px 12px" }}><span style={baseStyles.badge(u.role === "admin" ? colors.purple : u.role === "sysadmin" ? colors.danger : colors.blue)}>{u.role}</span></td>
                  <td style={{ padding: "10px 12px", color: colors.textDim, fontSize: 13 }}>{u.faculty}</td>
                  <td style={{ padding: "10px 12px" }}><span style={{ color: u.is_eligible ? colors.accent : colors.textMuted }}>{u.is_eligible ? "✅" : "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "audit" && (
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>📋</span> Audit Trail</div>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {(Array.isArray(auditLogs) ? auditLogs : []).map(log => (
              <div key={log.id} style={{ padding: "12px 0", borderBottom: `1px solid ${colors.border}22`, display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>{new Date(log.created_at).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{log.ip_address}</div>
                </div>
                <div>
                  <span style={baseStyles.badge(colors.blue)}>{log.action}</span>
                  <div style={{ fontSize: 13, color: colors.textDim, marginTop: 4 }}>{log.details}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{log.actor_name}</div>
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
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.get("/accounts/system-health/").then(setHealth).catch(() => setHealth({ error: true }));
  }, []);

  return (
    <div style={baseStyles.container}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: colors.white, margin: "0 0 24px" }}>System Administration</h1>
      <div style={baseStyles.grid(3)}>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>🗄️</span> Database</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: health?.database === "connected" ? colors.accent : colors.danger }} />
            <span style={{ color: colors.text }}>{health?.database || "checking..."}</span>
          </div>
        </div>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>🔗</span> Blockchain</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: colors.warning }} />
            <span style={{ color: colors.text }}>Ganache (Local Dev)</span>
          </div>
          <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>Connect Ganache on port 8545 for full blockchain features</p>
        </div>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardHeader}><span>⚡</span> System Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: health?.status === "operational" ? colors.accent : colors.danger }} />
            <span style={{ color: colors.text }}>{health?.status || "checking..."}</span>
          </div>
        </div>
      </div>

      <div style={baseStyles.card}>
        <div style={baseStyles.cardHeader}><span>📖</span> System Information</div>
        <div style={{ display: "grid", gap: 12 }}>
          {[
            ["Backend Framework", "Django 5.x (Python)"],
            ["Frontend Framework", "React.js"],
            ["Database", "SQLite (dev) / PostgreSQL (prod)"],
            ["Blockchain Platform", "Ethereum (Ganache local / Sepolia testnet)"],
            ["Smart Contract Language", "Solidity ^0.8.19"],
            ["Authentication", "JWT (JSON Web Tokens)"],
            ["API Architecture", "REST API (Django REST Framework)"],
            ["Blockchain Library", "Web3.py (backend) / Web3.js (frontend)"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: colors.cardAlt, borderRadius: 8 }}>
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
      case "election-detail": return selectedElection ? <ElectionDetail election={selectedElection} setView={setView} /> : <ElectionsList setView={setView} setSelectedElection={setSelectedElection} />;
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
      <AppContent />
    </AuthProvider>
  );
}
