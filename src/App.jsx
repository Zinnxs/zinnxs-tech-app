
// ══════════════════════════════════════════════════════════════════════════════
//  PodStudio — Sistema Completo de Gerenciamento de Podcasts
//  React + Context API + Storage + AI (Claude) + Web Audio API
//  10 Páginas · 6 Entidades · CRUD Completo · Estúdio Real
// ══════════════════════════════════════════════════════════════════════════════
import {
  useState, useEffect, useRef, useCallback, createContext, useContext, useMemo
} from "react";
import {
  Mic, MicOff, Square, Play, Pause, Download, Upload, Rss, Settings,
  Users, FileText, BarChart2, Share2, Plus, Trash2, Edit3, Search,
  ChevronRight, ChevronLeft, ChevronDown, Volume2, Clock, LogOut,
  Calendar, CheckCircle, Headphones, Wand2, Sparkles, Globe, Lock,
  Copy, ExternalLink, Bell, Layers, X, Check, ArrowRight, ArrowLeft,
  Hash, BookOpen, Loader, Radio, PenLine, StopCircle, PlayCircle,
  LayoutDashboard, Mic2, Scissors, MoreHorizontal, Save, User,
  Zap, Target, Music, Star, AlertCircle, Filter, RefreshCw, Eye,
  MonitorSpeaker, AlignLeft, Tag, Info, Podcast, Columns, Link,
  GripVertical, Archive, TrendingUp, Award, Flame
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  // zinc scale
  z950:"#09090b", z900:"#18181b", z800:"#27272a", z750:"#2f2f32",
  z700:"#3f3f46", z600:"#52525b", z500:"#71717a", z400:"#a1a1aa",
  z300:"#d4d4d8", z200:"#e4e4e7", z100:"#f4f4f5", z50:"#fafafa",
  // violet accent
  v700:"#6d28d9", v600:"#7c3aed", v500:"#8b5cf6", v400:"#a78bfa",
  v300:"#c4b5fd", v200:"#ddd6fe", v100:"#ede9fe",
  // semantic
  success:"#22c55e", successD:"#22c55e1a", successB:"#22c55e40",
  warn:"#eab308",   warnD:"#eab3081a",   warnB:"#eab30840",
  danger:"#ef4444",  dangerD:"#ef44441a",  dangerB:"#ef444440",
  info:"#3b82f6",    infoD:"#3b82f61a",
  // accent shortcuts
  acc:"#7c3aed", accH:"#6d28d9", accD:"#7c3aed1a", accB:"#7c3aed40",
};

const CSS_VARS = `
  :root {
    --bg: ${T.z950}; --surface: ${T.z900}; --surface2: ${T.z800};
    --border: ${T.z800}; --border2: ${T.z700};
    --text1: ${T.z50}; --text2: ${T.z300}; --text3: ${T.z400};
    --text4: ${T.z500}; --text5: ${T.z600};
    --acc: ${T.acc}; --acc-h: ${T.accH}; --acc-d: ${T.accD}; --acc-b: ${T.accB};
  }
`;

// ─── ENTITY SCHEMAS / SEEDS ───────────────────────────────────────────────────
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;

const SEED = {
  podcasts: [
    { id:"pod1", title:"Ponto de Fuga", description:"Sobre mim...", cover_url:"", category:"Diário Pessoal", language:"pt-BR", author:"Leonardo José", website:"", status:"active" }
  ],
  episodes: [
    
  ],
  guests: [
    
  ],
  scripts: [
    
  ],
  audioTracks: [
    
  ],
  sessions: [
    
  ],
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const SK = {
  podcasts:"ps_v2_podcasts", episodes:"ps_v2_episodes", guests:"ps_v2_guests",
  scripts:"ps_v2_scripts", audioTracks:"ps_v2_tracks", sessions:"ps_v2_sessions",
  user:"ps_v2_user"
};

const SEED_USER = { id:"usr1", email:"leonardojoseoliv@gmail.com", full_name:"Leonardo José", role:"admin" };

async function loadAll() {
  const r = {};
  for (const [k, key] of Object.entries(SK)) {
    try {
      const v = await window.storage.get(key);
      r[k] = v ? JSON.parse(v.value) : (k === "user" ? SEED_USER : SEED[k]);
    } catch { r[k] = k === "user" ? SEED_USER : SEED[k]; }
  }
  return r;
}
async function persist(entity, data) {
  try { await window.storage.set(SK[entity], JSON.stringify(data)); } catch {}
}

// ─── AI ───────────────────────────────────────────────────────────────────────
async function callAI(prompt, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:1200,
      system: system || "Você é especialista em produção e gestão de podcasts. Responda sempre em português do Brasil de forma prática e direta.",
      messages:[{ role:"user", content:prompt }]
    })
  });
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

// ─── APP CONTEXT ──────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─── STATUS CONFIGS ───────────────────────────────────────────────────────────
const EP_STATUS = {
  draft:     { label:"Rascunho",  color:T.z400,      bg:`${T.z400}1a` },
  recording: { label:"Gravando",  color:T.danger,    bg:T.dangerD },
  editing:   { label:"Editando",  color:T.warn,      bg:T.warnD },
  published: { label:"Publicado", color:T.success,   bg:T.successD },
};
const POD_STATUS = {
  active:   { label:"Ativo",     color:T.success, bg:T.successD },
  paused:   { label:"Pausado",   color:T.warn,    bg:T.warnD },
  archived: { label:"Arquivado", color:T.z400,    bg:`${T.z400}1a` },
};
const GUEST_STATUS = {
  invited:   { label:"Convidado",  color:T.info,    bg:T.infoD },
  confirmed: { label:"Confirmado", color:T.acc,     bg:T.accD },
  recorded:  { label:"Gravado",    color:T.success, bg:T.successD },
  cancelled: { label:"Cancelado",  color:T.danger,  bg:T.dangerD },
};
const SCRIPT_STATUS = {
  draft:    { label:"Rascunho", color:T.z400,    bg:`${T.z400}1a` },
  review:   { label:"Revisão",  color:T.warn,    bg:T.warnD },
  approved: { label:"Aprovado", color:T.success, bg:T.successD },
};
const SESSION_STATUS = {
  scheduled:  { label:"Agendado",   color:T.info,    bg:T.infoD },
  confirmed:  { label:"Confirmado", color:T.acc,     bg:T.accD },
  completed:  { label:"Concluído",  color:T.success, bg:T.successD },
  cancelled:  { label:"Cancelado",  color:T.danger,  bg:T.dangerD },
};
const TRACK_TYPE = {
  raw:       { label:"Bruto",       color:T.z400 },
  processed: { label:"Processado",  color:T.warn },
  final:     { label:"Final",       color:T.success },
};
const UPLOAD_STATUS = {
  pending:   { label:"Pendente",  color:T.z400 },
  uploading: { label:"Enviando",  color:T.info },
  done:      { label:"Enviado",   color:T.success },
  error:     { label:"Erro",      color:T.danger },
};
const BLOCK_TYPES = {
  intro:     { label:"Abertura",    color:T.acc,     emoji:"🎙️" },
  segment:   { label:"Segmento",    color:T.info,    emoji:"📋" },
  interview: { label:"Entrevista",  color:T.success, emoji:"🎤" },
  ad:        { label:"Patrocínio",  color:T.warn,    emoji:"📢" },
  outro:     { label:"Encerramento",color:T.v400,    emoji:"🔚" },
  note:      { label:"Nota",        color:T.z400,    emoji:"📝" },
};
const CATEGORIES = ["Tecnologia","Negócios","Educação","Entretenimento","Saúde","Ciência","Cultura","Esportes","Arte","Outro"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const PLATFORMS = [
  { name:"Spotify",        color:"#1db954", emoji:"🎵" },
  { name:"Apple Podcasts", color:"#d56eff", emoji:"🎧" },
  { name:"Google Podcasts",color:"#4285f4", emoji:"🔵" },
  { name:"Deezer",         color:"#ff0092", emoji:"🩷" },
  { name:"Amazon Music",   color:"#00a8e0", emoji:"📦" },
  { name:"Pocket Casts",   color:"#f43e37", emoji:"🔴" },
];

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function Btn({ children, variant="ghost", size="md", onClick, disabled, style={}, title="", type="button" }) {
  const [h, setH] = useState(false);
  const pad = { sm:"4px 10px", md:"7px 14px", lg:"10px 22px" }[size];
  const fs  = { sm:11, md:13, lg:14 }[size];
  const br  = { sm:6, md:7, lg:8 }[size];
  const cfg = {
    primary: { bg: h ? T.accH : T.acc, color:"#fff", border:"none" },
    ghost:   { bg: h ? T.z800 : "transparent", color: h ? T.z100 : T.z400, border:`1px solid ${h?T.z700:T.z800}` },
    danger:  { bg: h ? "#dc2626" : T.dangerD, color:T.danger, border:`1px solid ${T.dangerB}` },
    success: { bg: h ? "#059669" : T.successD, color:T.success, border:`1px solid ${T.successB}` },
    outline: { bg: h ? T.accD : "transparent", color:T.acc, border:`1px solid ${T.accB}` },
    subtle:  { bg: h ? T.z750 : T.z800, color: h ? T.z100 : T.z300, border:`1px solid ${T.z700}` },
    icon:    { bg: h ? T.z800 : "transparent", color: h ? T.z200 : T.z500, border:`1px solid ${h?T.z700:T.z800}` },
  };
  const v = cfg[variant] || cfg.ghost;
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:pad, fontSize:fs,
        fontWeight:500, fontFamily:"inherit", borderRadius:br, cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?0.5:1, transition:"all 0.12s", outline:"none", flexShrink:0,
        background:v.bg, color:v.color, border:v.border, ...style }}>
      {children}
    </button>
  );
}

const Badge = ({ children, color = T.acc, bg }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:4,
    fontSize:11, fontWeight:500, color, background: bg || `${color}20`,
    border:`1px solid ${color}30`, whiteSpace:"nowrap", lineHeight:1.5 }}>
    {children}
  </span>
);

const StatusBadge = ({ status, map }) => {
  const s = map[status]; if (!s) return null;
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
};

function Input({ value, onChange, placeholder, style={}, type="text", onKeyDown, disabled, min, max, autoFocus, name }) {
  const [f, setF] = useState(false);
  return (
    <input type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder}
      disabled={disabled} min={min} max={max} autoFocus={autoFocus} name={name}
      onKeyDown={onKeyDown} onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ background:T.z800, border:`1px solid ${f ? T.acc : T.z700}`, borderRadius:7,
        padding:"8px 12px", color:T.z50, fontSize:13, fontFamily:"inherit", outline:"none",
        width:"100%", transition:"border-color 0.15s", ...style }} />
  );
}

function Textarea({ value, onChange, placeholder, rows=4, style={} }) {
  const [f, setF] = useState(false);
  return (
    <textarea value={value ?? ""} onChange={onChange} placeholder={placeholder} rows={rows}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ background:T.z800, border:`1px solid ${f ? T.acc : T.z700}`, borderRadius:7,
        padding:"8px 12px", color:T.z50, fontSize:13, fontFamily:"inherit", outline:"none",
        width:"100%", resize:"vertical", transition:"border-color 0.15s", ...style }} />
  );
}

function Select({ value, onChange, children, style={} }) {
  const [f, setF] = useState(false);
  return (
    <select value={value ?? ""} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ background:T.z800, border:`1px solid ${f ? T.acc : T.z700}`, borderRadius:7,
        padding:"8px 12px", color:T.z400, fontSize:13, fontFamily:"inherit", outline:"none",
        width:"100%", transition:"border-color 0.15s", ...style }}>
      {children}
    </select>
  );
}

const Lbl = ({ children }) => (
  <div style={{ fontSize:11, fontWeight:600, color:T.z500, letterSpacing:"0.06em", marginBottom:5 }}>
    {children}
  </div>
);

function FG({ label, children, style={} }) {
  return (
    <div style={{ marginBottom:14, ...style }}>
      {label && <Lbl>{label}</Lbl>}
      {children}
    </div>
  );
}

const Divider = ({ my=16 }) => (
  <div style={{ height:1, background:T.z800, margin:`${my}px 0` }} />
);

function Spinner({ size=14, color=T.acc }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation:"spin .7s linear infinite", flexShrink:0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={`${color}30`} strokeWidth="2.5"/>
      <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function Card({ children, style={}, onClick, hover=false, accent=false }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? T.z750 : T.z900,
        border:`1px solid ${accent ? T.accB : h ? T.z700 : T.z800}`,
        borderRadius:10, padding:18, transition:"all 0.12s",
        cursor:onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children, width=520 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:T.z900, border:`1px solid ${T.z700}`, borderRadius:12,
        width:"100%", maxWidth:width, maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 25px 80px rgba(0,0,0,.7)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"15px 20px", borderBottom:`1px solid ${T.z800}` }}>
          <span style={{ fontSize:15, fontWeight:700, color:T.z50 }}>{title}</span>
          <Btn variant="icon" onClick={onClose}><X size={14}/></Btn>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

const StatCard = ({ label, value, icon:Icon, color=T.acc, delta, onClick }) => (
  <Card hover={!!onClick} onClick={onClick} style={{ cursor:onClick?"pointer":"default" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
      <span style={{ fontSize:11, fontWeight:600, color:T.z500, letterSpacing:"0.05em" }}>{label.toUpperCase()}</span>
      <div style={{ width:34, height:34, borderRadius:9, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={16} color={color}/>
      </div>
    </div>
    <div style={{ fontSize:30, fontWeight:700, color:T.z50, letterSpacing:"-0.02em" }}>{value}</div>
    {delta && <div style={{ fontSize:11, color, marginTop:5 }}>{delta}</div>}
  </Card>
);

const Avatar = ({ name, size=36, color=T.acc }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}22`,
    border:`1.5px solid ${color}40`, display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:size * .35, fontWeight:700, color, flexShrink:0 }}>
    {name?.charAt(0)?.toUpperCase() || "?"}
  </div>
);

function Empty({ icon:Icon, message, action, onAction }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"72px 24px", color:T.z600, textAlign:"center" }}>
      <Icon size={40} style={{ marginBottom:16, opacity:0.3 }}/>
      <div style={{ fontSize:14, color:T.z500, marginBottom: action ? 18 : 0 }}>{message}</div>
      {action && <Btn variant="outline" onClick={onAction} size="sm"><Plus size={13}/>{action}</Btn>}
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
      marginBottom:24, gap:16 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:700, color:T.z50, letterSpacing:"-0.02em" }}>{title}</h1>
        {subtitle && <p style={{ fontSize:13, color:T.z500, marginTop:4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── TAG INPUT ────────────────────────────────────────────────────────────────
function TagInput({ tags=[], onChange }) {
  const [val, setVal] = useState("");
  const add = () => {
    const t = val.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]); setVal("");
  };
  const remove = (t) => onChange(tags.filter(x => x !== t));
  return (
    <div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:6 }}>
        {tags.map(t => (
          <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11,
            color:T.acc, background:T.accD, padding:"3px 8px", borderRadius:5, border:`1px solid ${T.accB}` }}>
            #{t}<X size={9} style={{ cursor:"pointer" }} onClick={() => remove(t)}/>
          </span>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <Input value={val} onChange={e => setVal(e.target.value)} placeholder="tag"
          onKeyDown={e => e.key === "Enter" && add()} style={{ padding:"6px 10px" }}/>
        <Btn variant="ghost" size="sm" onClick={add}><Plus size={12}/></Btn>
      </div>
    </div>
  );
}

// ─── GUEST CHECKBOX LIST ──────────────────────────────────────────────────────
function GuestCheckList({ guests, selected=[], onChange }) {
  return (
    <div style={{ background:T.z800, borderRadius:8, padding:10,
      display:"flex", flexDirection:"column", gap:7, maxHeight:160, overflowY:"auto" }}>
      {guests.length === 0
        ? <div style={{ fontSize:12, color:T.z500, textAlign:"center" }}>Nenhum convidado cadastrado.</div>
        : guests.map(g => (
          <label key={g.id} style={{ display:"flex", alignItems:"center", gap:9,
            cursor:"pointer", fontSize:13, color:T.z300 }}>
            <input type="checkbox" checked={selected.includes(g.id)}
              onChange={e => onChange(e.target.checked
                ? [...selected, g.id]
                : selected.filter(x => x !== g.id)
              )}
              style={{ accentColor:T.acc }}/>
            <Avatar name={g.name} size={22}/>
            <span>{g.name}</span>
            <StatusBadge status={g.status} map={GUEST_STATUS}/>
          </label>
        ))
      }
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"dashboard",    icon:LayoutDashboard, label:"Dashboard"    },
  { id:"podcasts",     icon:Radio,           label:"Podcasts"     },
  { id:"episodes",     icon:Headphones,      label:"Episódios"    },
  { id:"scripts",      icon:PenLine,         label:"Roteiros"     },
  { id:"guests",       icon:Users,           label:"Convidados"   },
  { id:"schedule",     icon:Calendar,        label:"Agenda"       },
  { id:"studio",       icon:Mic2,            label:"Estúdio"      },
  { id:"editor",       icon:Scissors,        label:"Edição"       },
  { id:"distribution", icon:Rss,             label:"Distribuição" },
];

function Sidebar() {
  const { page, go, data } = useApp();
  const draftCount = data.episodes.filter(e => e.status !== "published").length;

  return (
    <aside style={{ width:228, background:T.z900, borderRight:`1px solid ${T.z800}`,
      display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden" }}>
      {/* Logo */}
      <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid ${T.z800}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:36, height:36, borderRadius:10,
            background:`linear-gradient(135deg, ${T.v600} 0%, ${T.v400} 100%)`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            boxShadow:`0 4px 14px ${T.accB}` }}>
            <Headphones size={18} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:T.z50, letterSpacing:"-0.03em" }}>PodStudio</div>
            <div style={{ fontSize:10, color:T.z600, marginTop:1 }}>v1.0 · {data.user?.role}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:"10px 8px", flex:1, overflowY:"auto" }}>
        {NAV_ITEMS.map(n => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <div key={n.id} onClick={() => go(n.id)}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px",
                borderRadius:7, cursor:"pointer", marginBottom:2,
                background: active ? T.acc : "transparent",
                color: active ? "#fff" : T.z500,
                fontSize:13, fontWeight: active ? 600 : 400, transition:"all 0.12s",
                position:"relative" }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.z800; e.currentTarget.style.color = T.z200; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.z500; }}}>
              <Icon size={15}/>
              <span style={{ flex:1 }}>{n.label}</span>
              {n.id === "episodes" && draftCount > 0 && (
                <span style={{ fontSize:10, fontWeight:700, color: active ? "#fff" : T.acc,
                  background: active ? "rgba(255,255,255,0.2)" : T.accD,
                  padding:"1px 6px", borderRadius:10 }}>{draftCount}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${T.z800}`, padding:"8px 8px 12px" }}>
        <div onClick={() => go("settings")}
          style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 10px",
            borderRadius:7, cursor:"pointer", background: page==="settings"?T.acc:"transparent",
            color: page==="settings"?"#fff":T.z500, fontSize:13, transition:"all 0.12s" }}
          onMouseEnter={e => { if (page!=="settings") { e.currentTarget.style.background=T.z800; e.currentTarget.style.color=T.z200; }}}
          onMouseLeave={e => { if (page!=="settings") { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.z500; }}}>
          <Settings size={15}/>
          <span style={{ flex:1 }}>Configurações</span>
        </div>
        {/* User pill */}
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 10px 0",
          cursor:"pointer" }} onClick={() => go("settings")}>
          <Avatar name={data.user?.full_name} size={28} color={T.v500}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.z300, overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{data.user?.full_name}</div>
            <div style={{ fontSize:10, color:T.z600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{data.user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const analyticsMonthly = [
  {m:"Set",plays:1100,subs:55},{m:"Out",plays:1820,subs:90},{m:"Nov",plays:2240,subs:134},
  {m:"Dez",plays:1960,subs:108},{m:"Jan",plays:3180,subs:190},{m:"Fev",plays:4350,subs:268},
];
const epPerformance = [
  {name:"IA Generativa",plays:3240},{name:"Setup Barato",plays:2180},
  {name:"Audiência",plays:1840},{name:"Monetização",plays:980},{name:"Startups",plays:620},
];

function Dashboard() {
  const { data, go } = useApp();
  const { podcasts, episodes, guests, sessions } = data;

  const pub = episodes.filter(e => e.status === "published").length;
  const totalPlays = 12840;
  const upcoming = [...sessions]
    .filter(s => s.date >= new Date().toISOString().split("T")[0])
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const statusColors = { draft:T.z400, recording:T.danger, editing:T.warn, published:T.success };

  return (
    <div>
      <PageHeader
        title={`Olá, ${data.user?.full_name?.split(" ")[0]}! 👋`}
        subtitle="Aqui está o panorama completo da sua produção."
        action={<Btn variant="primary" onClick={() => go("episodes")}><Plus size={14}/>Novo Episódio</Btn>}
      />

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <StatCard label="Podcasts" value={podcasts.length} icon={Radio} color={T.acc}
          delta={`${podcasts.filter(p=>p.status==="active").length} ativos`} onClick={() => go("podcasts")}/>
        <StatCard label="Episódios" value={episodes.length} icon={Headphones} color={T.info}
          delta={`${pub} publicados`} onClick={() => go("episodes")}/>
        <StatCard label="Convidados" value={guests.length} icon={Users} color={T.success}
          delta={`${guests.filter(g=>g.status==="confirmed").length} confirmados`} onClick={() => go("guests")}/>
        <StatCard label="Total de Plays" value={(totalPlays).toLocaleString("pt-BR")} icon={TrendingUp} color={T.warn}
          delta="+34% vs mês passado"/>
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:18, marginBottom:18 }}>
        <Card>
          <div style={{ fontWeight:600, color:T.z200, marginBottom:16, fontSize:14 }}>Plays por Mês</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={analyticsMonthly}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.acc} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={T.acc} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.z800}/>
              <XAxis dataKey="m" tick={{fill:T.z600,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.z600,fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:T.z800,border:`1px solid ${T.z700}`,borderRadius:8,color:T.z200,fontSize:12}}/>
              <Area type="monotone" dataKey="plays" name="Plays" stroke={T.acc} strokeWidth={2.5} fill="url(#ga)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontWeight:600, color:T.z200, marginBottom:16, fontSize:14 }}>Top Episódios</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={epPerformance} layout="vertical" barSize={10}>
              <XAxis type="number" tick={{fill:T.z600,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:T.z400,fontSize:10}} axisLine={false} tickLine={false} width={90}/>
              <Tooltip contentStyle={{background:T.z800,border:`1px solid ${T.z700}`,borderRadius:8,color:T.z200,fontSize:12}}/>
              <Bar dataKey="plays" name="Plays" fill={T.acc} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:18 }}>
        {/* Recent episodes table */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ fontWeight:600, color:T.z200, fontSize:14 }}>Episódios Recentes</div>
            <Btn variant="ghost" size="sm" onClick={() => go("episodes")}>Ver todos<ArrowRight size={12}/></Btn>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.z800}` }}>
                {["Episódio","Podcast","Status","Ep"].map(h =>
                  <th key={h} style={{padding:"6px 10px",textAlign:"left",fontSize:10,color:T.z600,fontWeight:600,letterSpacing:"0.05em"}}>{h.toUpperCase()}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {[...episodes].slice(0, 6).map((ep, i) => {
                const pod = podcasts.find(p => p.id === ep.podcast_id);
                return (
                  <tr key={ep.id} style={{ borderBottom: i < 5 ? `1px solid ${T.z800}` : "none",
                    transition:"background 0.1s", cursor:"pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.z800}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={() => go("episodes")}>
                    <td style={{ padding:"9px 10px" }}>
                      <div style={{ fontWeight:500, color:T.z100 }}>{ep.title}</div>
                      {ep.tags?.slice(0,2).map(t => (
                        <span key={t} style={{ fontSize:10, color:T.z600, marginRight:4 }}>#{t}</span>
                      ))}
                    </td>
                    <td style={{ padding:"9px 10px", color:T.z500, fontSize:11 }}>{pod?.title || "—"}</td>
                    <td style={{ padding:"9px 10px" }}><StatusBadge status={ep.status} map={EP_STATUS}/></td>
                    <td style={{ padding:"9px 10px", color:T.z500 }}>S{ep.season_number}E{ep.episode_number}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Quick actions + upcoming */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card>
            <div style={{ fontWeight:600, color:T.z200, marginBottom:14, fontSize:14 }}>Acesso Rápido</div>
            {[
              ["Novo Episódio",    "episodes",    Plus,     T.acc],
              ["Agendar Gravação", "schedule",    Calendar, T.info],
              ["Abrir Estúdio",    "studio",      Mic2,     T.danger],
              ["Novo Roteiro",     "scripts",     PenLine,  T.success],
              ["Distribuição",     "distribution",Rss,      T.v400],
            ].map(([lbl, dest, Icon, col]) => (
              <div key={lbl} onClick={() => go(dest)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px",
                  background:T.z800, borderRadius:8, cursor:"pointer", marginBottom:6,
                  border:"1px solid transparent", transition:"all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${col}40`; e.currentTarget.style.background = `${col}0d`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = T.z800; }}>
                <Icon size={14} color={col}/>
                <span style={{ fontSize:13, color:T.z300, flex:1 }}>{lbl}</span>
                <ChevronRight size={12} color={T.z700}/>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ fontWeight:600, color:T.z200, marginBottom:14, fontSize:14 }}>Próximas Gravações</div>
            {upcoming.length === 0
              ? <div style={{ fontSize:12, color:T.z600, textAlign:"center", padding:12 }}>Nenhuma sessão agendada.</div>
              : upcoming.map(s => {
                const ep = episodes.find(e => e.id === s.episode_id);
                return (
                  <div key={s.id} style={{ marginBottom:10, paddingBottom:10,
                    borderBottom:`1px solid ${T.z800}` }} onClick={() => go("schedule")}>
                    <div style={{ fontSize:12, fontWeight:500, color:T.z100, marginBottom:3 }}>{s.title}</div>
                    <div style={{ fontSize:11, color:T.z500 }}>{s.date} · {s.time} · {s.duration_min}min</div>
                    <StatusBadge status={s.status} map={SESSION_STATUS}/>
                  </div>
                );
              })
            }
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── PODCASTS ─────────────────────────────────────────────────────────────────
function Podcasts() {
  const { data, update } = useApp();
  const [modal, setModal] = useState(null); // null | "create" | "edit"
  const [form, setForm] = useState({});

  const blank = () => ({
    id:uid(), title:"", description:"", cover_url:"", category:"Tecnologia",
    language:"pt-BR", author:"", website:"", status:"active"
  });

  const openCreate = () => { setForm(blank()); setModal("create"); };
  const openEdit   = (p) => { setForm({...p}); setModal("edit"); };
  const closeModal = () => setModal(null);

  const save = () => {
    const next = modal === "edit"
      ? data.podcasts.map(p => p.id === form.id ? form : p)
      : [...data.podcasts, form];
    update("podcasts", next);
    closeModal();
  };

  const del = (id) => {
    if (!confirm("Deletar este podcast? Os episódios vinculados serão mantidos.")) return;
    update("podcasts", data.podcasts.filter(p => p.id !== id));
  };

  const epsCount = (id) => data.episodes.filter(e => e.podcast_id === id).length;

  return (
    <div>
      <PageHeader title="Podcasts"
        subtitle={`${data.podcasts.length} podcast${data.podcasts.length !== 1 ? "s" : ""} cadastrado${data.podcasts.length !== 1 ? "s" : ""}.`}
        action={<Btn variant="primary" onClick={openCreate}><Plus size={14}/>Novo Podcast</Btn>}
      />

      {data.podcasts.length === 0
        ? <Empty icon={Radio} message="Nenhum podcast cadastrado." action="Criar Podcast" onAction={openCreate}/>
        : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:16 }}>
            {data.podcasts.map(p => (
              <Card key={p.id} hover style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                  <div style={{ width:56, height:56, borderRadius:12, background:T.accD,
                    border:`1px solid ${T.accB}`, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:24, flexShrink:0 }}>🎙️</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, color:T.z50, fontSize:16,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div>
                    <div style={{ marginTop:5 }}><StatusBadge status={p.status} map={POD_STATUS}/></div>
                  </div>
                  <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                    <Btn variant="icon" size="sm" onClick={() => openEdit(p)} title="Editar"><Edit3 size={13}/></Btn>
                    <Btn variant="icon" size="sm" onClick={() => del(p.id)} title="Deletar"><Trash2 size={13}/></Btn>
                  </div>
                </div>

                <p style={{ fontSize:12, color:T.z500, lineHeight:1.6, margin:0,
                  display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {p.description || "Sem descrição."}
                </p>

                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <Badge color={T.z400} bg={`${T.z400}15`}>{p.category}</Badge>
                  <Badge color={T.z400} bg={`${T.z400}15`}>{p.language}</Badge>
                  <Badge color={T.info} bg={T.infoD}>{epsCount(p.id)} ep.</Badge>
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  paddingTop:10, borderTop:`1px solid ${T.z800}` }}>
                  <div style={{ fontSize:11, color:T.z600 }}>por {p.author || "—"}</div>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:4, fontSize:11,
                        color:T.acc, textDecoration:"none" }}>
                      <Globe size={11}/> Site
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      }

      <Modal open={!!modal} onClose={closeModal}
        title={modal === "edit" ? "Editar Podcast" : "Novo Podcast"} width={560}>
        <FG label="TÍTULO *">
          <Input value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} placeholder="Nome do podcast"/>
        </FG>
        <FG label="DESCRIÇÃO">
          <Textarea value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))}
            placeholder="Sobre o podcast…" rows={3}/>
        </FG>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FG label="CATEGORIA">
            <Select value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FG>
          <FG label="IDIOMA">
            <Select value={form.language} onChange={e => setForm(f => ({...f, language:e.target.value}))}>
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
              <option value="es-LATAM">Español (LATAM)</option>
            </Select>
          </FG>
          <FG label="AUTOR">
            <Input value={form.author} onChange={e => setForm(f => ({...f, author:e.target.value}))} placeholder="Seu nome"/>
          </FG>
          <FG label="STATUS">
            <Select value={form.status} onChange={e => setForm(f => ({...f, status:e.target.value}))}>
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="archived">Arquivado</option>
            </Select>
          </FG>
        </div>
        <FG label="WEBSITE">
          <Input value={form.website} onChange={e => setForm(f => ({...f, website:e.target.value}))} placeholder="https://..."/>
        </FG>
        <FG label="URL DA CAPA (imagem)">
          <Input value={form.cover_url} onChange={e => setForm(f => ({...f, cover_url:e.target.value}))} placeholder="https://..."/>
        </FG>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:6 }}>
          <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
          <Btn variant="primary" onClick={save} disabled={!form.title?.trim()}>
            <Save size={13}/>{modal === "edit" ? "Salvar Alterações" : "Criar Podcast"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── EPISODES ─────────────────────────────────────────────────────────────────
function Episodes() {
  const { data, update, go } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPod, setFilterPod] = useState("all");
  const [search, setSearch] = useState("");

  const blank = () => ({
    id:uid(), podcast_id: data.podcasts[0]?.id || "", title:"", description:"",
    episode_number:1, season_number:1, status:"draft", audio_url:"",
    duration_seconds:0, publish_date:"", show_notes:"", tags:[]
  });

  const openCreate = () => { setForm(blank()); setModal("create"); };
  const openEdit = (ep) => { setForm({...ep, tags:[...(ep.tags||[])]}); setModal("edit"); };
  const closeModal = () => setModal(null);

  const save = () => {
    const next = modal === "edit"
      ? data.episodes.map(e => e.id === form.id ? form : e)
      : [...data.episodes, form];
    update("episodes", next); closeModal();
  };

  const del = (id) => update("episodes", data.episodes.filter(e => e.id !== id));

  const filtered = data.episodes.filter(ep => {
    if (filterStatus !== "all" && ep.status !== filterStatus) return false;
    if (filterPod !== "all" && ep.podcast_id !== filterPod) return false;
    if (search && !ep.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmtDur = (s) => {
    if (!s) return "—";
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}`;
  };

  return (
    <div>
      <PageHeader title="Episódios"
        subtitle={`${data.episodes.length} episódios • ${data.episodes.filter(e=>e.status==="published").length} publicados.`}
        action={<Btn variant="primary" onClick={openCreate}><Plus size={14}/>Novo Episódio</Btn>}
      />

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:220 }}>
          <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.z600, pointerEvents:"none" }}/>
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar episódios…" style={{ paddingLeft:32 }}/>
        </div>
        <Select value={filterPod} onChange={e => setFilterPod(e.target.value)} style={{ width:180 }}>
          <option value="all">Todos os podcasts</option>
          {data.podcasts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
        <div style={{ display:"flex", gap:5 }}>
          {[["all","Todos"], ...Object.entries(EP_STATUS).map(([k,v])=>[k,v.label])].map(([k,l]) => (
            <Btn key={k} variant={filterStatus===k?"primary":"ghost"} size="sm" onClick={() => setFilterStatus(k)}>{l}</Btn>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <Empty icon={Headphones} message="Nenhum episódio encontrado." action="Criar Episódio" onAction={openCreate}/>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map(ep => {
              const pod = data.podcasts.find(p => p.id === ep.podcast_id);
              return (
                <Card key={ep.id} hover style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:46, height:46, borderRadius:10, background:T.accD,
                    border:`1px solid ${T.accB}`, display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0, fontSize:12, fontWeight:800, color:T.acc }}>
                    E{ep.episode_number}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, color:T.z100, marginBottom:5 }}>{ep.title}</div>
                    <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
                      <StatusBadge status={ep.status} map={EP_STATUS}/>
                      {pod && <Badge color={T.z500} bg={`${T.z500}15`}>{pod.title}</Badge>}
                      <Badge color={T.z600} bg={`${T.z600}15`}>S{ep.season_number}E{ep.episode_number}</Badge>
                      {ep.tags?.slice(0,2).map(t => (
                        <span key={t} style={{ fontSize:10, color:T.z600, background:T.z800, padding:"2px 6px", borderRadius:3 }}>#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", fontSize:12, color:T.z600, flexShrink:0 }}>
                    <div>{fmtDur(ep.duration_seconds)}</div>
                    <div style={{ marginTop:2, fontSize:11 }}>{ep.publish_date || "Sem data"}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <Btn variant="outline" size="sm" onClick={() => go("studio", { episodeId:ep.id })}>
                      <Mic2 size={12}/>Estúdio
                    </Btn>
                    <Btn variant="icon" size="sm" onClick={() => openEdit(ep)} title="Editar"><Edit3 size={13}/></Btn>
                    <Btn variant="icon" size="sm" onClick={() => del(ep.id)} title="Deletar"><Trash2 size={13}/></Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      }

      <Modal open={!!modal} onClose={closeModal}
        title={modal==="edit" ? "Editar Episódio" : "Novo Episódio"} width={600}>
        <FG label="PODCAST *">
          <Select value={form.podcast_id} onChange={e => setForm(f => ({...f, podcast_id:e.target.value}))}>
            {data.podcasts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
        </FG>
        <FG label="TÍTULO *">
          <Input value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} placeholder="Título do episódio"/>
        </FG>
        <FG label="DESCRIÇÃO">
          <Textarea value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Descrição do episódio…" rows={2}/>
        </FG>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <FG label="Nº EPISÓDIO"><Input type="number" min="1" value={form.episode_number||1} onChange={e => setForm(f => ({...f, episode_number:+e.target.value}))}/></FG>
          <FG label="TEMPORADA"><Input type="number" min="1" value={form.season_number||1} onChange={e => setForm(f => ({...f, season_number:+e.target.value}))}/></FG>
          <FG label="STATUS">
            <Select value={form.status||"draft"} onChange={e => setForm(f => ({...f, status:e.target.value}))}>
              {Object.entries(EP_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </FG>
        </div>
        <FG label="DATA DE PUBLICAÇÃO">
          <Input type="date" value={form.publish_date||""} onChange={e => setForm(f => ({...f, publish_date:e.target.value}))}/>
        </FG>
        <FG label="SHOW NOTES">
          <Textarea value={form.show_notes||""} onChange={e => setForm(f => ({...f, show_notes:e.target.value}))} placeholder="Notas, links mencionados, recursos…" rows={3}/>
        </FG>
        <FG label="TAGS">
          <TagInput tags={form.tags||[]} onChange={tags => setForm(f => ({...f, tags}))}/>
        </FG>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:6 }}>
          <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
          <Btn variant="primary" onClick={save} disabled={!form.title?.trim()}>
            <Save size={13}/>{modal === "edit" ? "Salvar Alterações" : "Criar Episódio"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── SCRIPTS (ROTEIROS) ───────────────────────────────────────────────────────
function Scripts() {
  const { data, update } = useApp();
  const [selId, setSelId] = useState(data.scripts[0]?.id || null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanel, setAiPanel] = useState(null);

  const sel = data.scripts.find(s => s.id === selId) || null;

  const blank = () => ({
    id:uid(), episode_id:data.episodes[0]?.id||"", title:"",
    content:"", blocks:[ {id:uid(),type:"intro",title:"Abertura",content:"",duration_min:2} ],
    status:"draft"
  });

  const openCreate = () => { setForm(blank()); setModal(true); };
  const closeModal = () => setModal(false);

  const saveForm = () => {
    const exists = data.scripts.find(s => s.id === form.id);
    const next = exists
      ? data.scripts.map(s => s.id === form.id ? form : s)
      : [...data.scripts, form];
    update("scripts", next);
    if (!exists) setSelId(form.id);
    closeModal();
  };

  const delScript = (id) => {
    update("scripts", data.scripts.filter(s => s.id !== id));
    setSelId(null);
  };

  const updateSel = (patch) => {
    const updated = { ...sel, ...patch };
    update("scripts", data.scripts.map(s => s.id === sel.id ? updated : s));
    // sel ref will update on next render via data
  };

  const addBlock = () => {
    const nb = { id:uid(), type:"segment", title:"Novo Segmento", content:"", duration_min:5 };
    updateSel({ blocks:[...sel.blocks, nb] });
  };

  const updateBlock = (bid, field, val) => {
    updateSel({ blocks: sel.blocks.map(b => b.id === bid ? {...b,[field]:val} : b) });
  };

  const deleteBlock = (bid) => {
    updateSel({ blocks: sel.blocks.filter(b => b.id !== bid) });
  };

  const totalDur = sel ? sel.blocks.reduce((a,b) => a + (b.duration_min||0), 0) : 0;

  const generateWithAI = async () => {
    if (!sel) return;
    const ep = data.episodes.find(e => e.id === sel.episode_id);
    setAiLoading(true);
    try {
      const res = await callAI(
        `Crie um roteiro profissional e completo para um episódio de podcast com título: "${ep?.title || sel.title}" e descrição: "${ep?.description || ""}". Retorne SOMENTE um JSON array de blocos, sem texto adicional, sem markdown. Cada bloco: {"type":"intro|segment|interview|ad|outro|note","title":"...","content":"...","duration_min":N}. Crie 5-7 blocos detalhados com conteúdo real, perguntas, pontos principais. Em português do Brasil.`,
        "Você é roteirista especializado em podcasts. Retorne apenas JSON válido, sem markdown, sem explicações."
      );
      const clean = res.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      updateSel({ blocks: parsed.map(b => ({...b, id:uid()})) });
    } catch(e) {
      alert("Erro ao gerar roteiro. Tente novamente.");
    }
    setAiLoading(false);
  };

  const improveBlock = async (bid) => {
    const block = sel.blocks.find(b => b.id === bid);
    if (!block) return;
    setAiPanel(bid);
    try {
      const res = await callAI(
        `Melhore o seguinte conteúdo de bloco de roteiro de podcast (tipo: ${block.title}). Torne mais dinâmico, engajante e profissional. Retorne apenas o texto melhorado:\n\n${block.content}`,
        "Você é roteirista especializado em podcasts. Retorne apenas o texto melhorado, sem explicações."
      );
      updateBlock(bid, "content", res);
    } catch {}
    setAiPanel(null);
  };

  return (
    <div style={{ display:"flex", gap:20, height:"calc(100vh - 130px)", overflow:"hidden" }}>
      {/* Left panel: script list */}
      <div style={{ width:260, flexShrink:0, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.z50 }}>Roteiros</h2>
          <Btn variant="primary" size="sm" onClick={openCreate}><Plus size={13}/></Btn>
        </div>
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
          {data.scripts.length === 0
            ? <Empty icon={PenLine} message="Nenhum roteiro ainda."/>
            : data.scripts.map(sc => {
              const ep = data.episodes.find(e => e.id === sc.episode_id);
              const active = selId === sc.id;
              const dur = sc.blocks?.reduce((a,b) => a+(b.duration_min||0),0) || 0;
              return (
                <div key={sc.id} onClick={() => setSelId(sc.id)}
                  style={{ background: active ? T.accD : T.z900,
                    border:`1px solid ${active ? T.accB : T.z800}`,
                    borderRadius:9, padding:13, cursor:"pointer", transition:"all 0.12s" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                    <div style={{ fontWeight:500, color:T.z100, fontSize:13, lineHeight:1.4, flex:1 }}>{sc.title}</div>
                    <Btn variant="icon" size="sm" onClick={e => { e.stopPropagation(); delScript(sc.id); }}>
                      <Trash2 size={11}/>
                    </Btn>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:7 }}>
                    <StatusBadge status={sc.status} map={SCRIPT_STATUS}/>
                    <span style={{ fontSize:10, color:T.z600 }}>{dur}min</span>
                  </div>
                  {ep && <div style={{ fontSize:11, color:T.z600, marginTop:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ep.title}</div>}
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Right panel: block editor */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {!sel ? (
          <Empty icon={PenLine} message="Selecione um roteiro para editar." action="Novo Roteiro" onAction={openCreate}/>
        ) : (
          <div>
            {/* Script header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:700, color:T.z50, marginBottom:4 }}>{sel.title}</div>
                <div style={{ fontSize:12, color:T.z600 }}>
                  {sel.blocks.length} blocos · {totalDur} min total ·{" "}
                  {data.episodes.find(e=>e.id===sel.episode_id)?.title || "—"}
                </div>
              </div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                <Select value={sel.status}
                  onChange={e => updateSel({ status:e.target.value })}
                  style={{ width:130, padding:"6px 10px", fontSize:12 }}>
                  {Object.entries(SCRIPT_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
                <Btn variant="outline" size="sm" onClick={generateWithAI} disabled={aiLoading}>
                  {aiLoading ? <><Spinner size={12}/>Gerando…</> : <><Wand2 size={13}/>Gerar com IA</>}
                </Btn>
                <Btn variant="icon" size="sm" onClick={() => { setForm({...sel}); setModal(true); }} title="Editar metadados">
                  <Edit3 size={13}/>
                </Btn>
              </div>
            </div>

            {/* Blocks */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {sel.blocks.map((block, idx) => {
                const bt = BLOCK_TYPES[block.type] || BLOCK_TYPES.segment;
                const isImproving = aiPanel === block.id;
                return (
                  <div key={block.id} style={{ background:T.z900, border:`1px solid ${T.z800}`,
                    borderLeft:`4px solid ${bt.color}`, borderRadius:9, padding:16 }}>
                    {/* Block header */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                      <span style={{ fontSize:16 }}>{bt.emoji}</span>
                      <Select value={block.type} onChange={e => updateBlock(block.id,"type",e.target.value)}
                        style={{ width:140, padding:"4px 8px", fontSize:12 }}>
                        {Object.entries(BLOCK_TYPES).map(([k,v]) =>
                          <option key={k} value={k}>{v.emoji} {v.label}</option>
                        )}
                      </Select>
                      <Input value={block.title} onChange={e => updateBlock(block.id,"title",e.target.value)}
                        placeholder="Título do bloco" style={{ flex:1, padding:"5px 10px", fontSize:12 }}/>
                      <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                        <Input type="number" min="0" value={block.duration_min}
                          onChange={e => updateBlock(block.id,"duration_min",+e.target.value)}
                          style={{ width:56, padding:"5px 8px", fontSize:12, textAlign:"center" }}/>
                        <span style={{ fontSize:11, color:T.z600 }}>min</span>
                      </div>
                      <Btn variant="ghost" size="sm" onClick={() => improveBlock(block.id)} disabled={isImproving} title="Melhorar com IA">
                        {isImproving ? <Spinner size={11}/> : <Sparkles size={12}/>}
                      </Btn>
                      <Btn variant="icon" size="sm" onClick={() => deleteBlock(block.id)} title="Remover bloco">
                        <Trash2 size={12}/>
                      </Btn>
                    </div>
                    {/* Block content */}
                    <Textarea value={block.content}
                      onChange={e => updateBlock(block.id,"content",e.target.value)}
                      placeholder="Conteúdo do bloco — roteiro, perguntas, pontos principais…"
                      rows={block.type === "interview" ? 8 : 5}
                      style={{ fontFamily:"'JetBrains Mono', 'Fira Code', monospace", fontSize:12, lineHeight:1.8 }}/>
                  </div>
                );
              })}

              <Btn variant="ghost" style={{ alignSelf:"flex-start" }} onClick={addBlock}>
                <Plus size={13}/>Adicionar Bloco
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal open={modal} onClose={closeModal}
        title={data.scripts.find(s=>s.id===form.id) ? "Editar Roteiro" : "Novo Roteiro"}>
        <FG label="EPISÓDIO *">
          <Select value={form.episode_id||""} onChange={e => setForm(f => ({...f, episode_id:e.target.value}))}>
            {data.episodes.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </Select>
        </FG>
        <FG label="TÍTULO *">
          <Input value={form.title||""} onChange={e => setForm(f => ({...f, title:e.target.value}))} placeholder="Título do roteiro"/>
        </FG>
        <FG label="STATUS">
          <Select value={form.status||"draft"} onChange={e => setForm(f => ({...f, status:e.target.value}))}>
            {Object.entries(SCRIPT_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FG>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
          <Btn variant="primary" onClick={saveForm} disabled={!form.title?.trim()}>
            <Save size={13}/>Salvar
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── GUESTS ───────────────────────────────────────────────────────────────────
function Guests() {
  const { data, update } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const blank = () => ({
    id:uid(), name:"", email:"", bio:"", photo_url:"",
    social_links:{ instagram:"", twitter:"", linkedin:"", website:"" },
    episode_ids:[], status:"invited"
  });

  const openCreate = () => { setForm(blank()); setModal("create"); };
  const openEdit = (g) => { setForm({ ...g, social_links:{...g.social_links} }); setModal("edit"); };
  const closeModal = () => setModal(null);

  const save = () => {
    const next = modal === "edit"
      ? data.guests.map(g => g.id === form.id ? form : g)
      : [...data.guests, form];
    update("guests", next); closeModal();
  };

  const del = (id) => update("guests", data.guests.filter(g => g.id !== id));

  const filtered = data.guests.filter(g => {
    if (filterStatus !== "all" && g.status !== filterStatus) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase()) &&
        !g.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const guestEps = (g) => data.episodes.filter(e => g.episode_ids?.includes(e.id));

  return (
    <div>
      <PageHeader title="Convidados"
        subtitle={`${data.guests.length} convidados cadastrados.`}
        action={<Btn variant="primary" onClick={openCreate}><Plus size={14}/>Novo Convidado</Btn>}
      />

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:T.z600, pointerEvents:"none" }}/>
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar convidados…" style={{ paddingLeft:32 }}/>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[["all","Todos"], ...Object.entries(GUEST_STATUS).map(([k,v])=>[k,v.label])].map(([k,l]) => (
            <Btn key={k} variant={filterStatus===k?"primary":"ghost"} size="sm" onClick={() => setFilterStatus(k)}>{l}</Btn>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <Empty icon={Users} message="Nenhum convidado encontrado." action="Adicionar Convidado" onAction={openCreate}/>
        : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
            {filtered.map(g => {
              const eps = guestEps(g);
              const sl = g.social_links || {};
              return (
                <Card key={g.id} hover style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    {g.photo_url
                      ? <img src={g.photo_url} alt={g.name} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
                      : <Avatar name={g.name} size={48}/>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:T.z50, marginBottom:3 }}>{g.name}</div>
                      {g.email && <div style={{ fontSize:11, color:T.z600, marginBottom:5 }}>{g.email}</div>}
                      <StatusBadge status={g.status} map={GUEST_STATUS}/>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <Btn variant="icon" size="sm" onClick={() => openEdit(g)}><Edit3 size={12}/></Btn>
                      <Btn variant="icon" size="sm" onClick={() => del(g.id)}><Trash2 size={12}/></Btn>
                    </div>
                  </div>

                  {g.bio && (
                    <p style={{ fontSize:12, color:T.z500, lineHeight:1.6, margin:0,
                      display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {g.bio}
                    </p>
                  )}

                  {/* Social links */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {sl.twitter && <Badge color={T.info} bg={T.infoD}>@{sl.twitter}</Badge>}
                    {sl.instagram && <Badge color={T.danger} bg={T.dangerD}>@{sl.instagram}</Badge>}
                    {sl.linkedin && <Badge color={T.info} bg={T.infoD}>{sl.linkedin}</Badge>}
                    {sl.website && (
                      <a href={sl.website} target="_blank" rel="noreferrer"
                        style={{ textDecoration:"none" }}>
                        <Badge color={T.acc} bg={T.accD}><Globe size={9}/> Site</Badge>
                      </a>
                    )}
                  </div>

                  {/* Episodes */}
                  {eps.length > 0 && (
                    <div style={{ paddingTop:10, borderTop:`1px solid ${T.z800}` }}>
                      <div style={{ fontSize:11, color:T.z600, marginBottom:5 }}>APARECE EM:</div>
                      {eps.map(e => (
                        <div key={e.id} style={{ fontSize:12, color:T.z400, marginBottom:3 }}>• {e.title}</div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      }

      <Modal open={!!modal} onClose={closeModal}
        title={modal === "edit" ? "Editar Convidado" : "Novo Convidado"} width={560}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FG label="NOME *" style={{ gridColumn:"1/-1" }}>
            <Input value={form.name||""} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="Nome completo"/>
          </FG>
          <FG label="E-MAIL">
            <Input value={form.email||""} onChange={e => setForm(f => ({...f, email:e.target.value}))} placeholder="email@exemplo.com"/>
          </FG>
          <FG label="STATUS">
            <Select value={form.status||"invited"} onChange={e => setForm(f => ({...f, status:e.target.value}))}>
              {Object.entries(GUEST_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </FG>
        </div>
        <FG label="BIO">
          <Textarea value={form.bio||""} onChange={e => setForm(f => ({...f, bio:e.target.value}))}
            placeholder="Apresentação do convidado…" rows={3}/>
        </FG>
        <FG label="URL DA FOTO">
          <Input value={form.photo_url||""} onChange={e => setForm(f => ({...f, photo_url:e.target.value}))} placeholder="https://..."/>
        </FG>
        <div style={{ borderBottom:`1px solid ${T.z800}`, marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.z500, marginBottom:10 }}>REDES SOCIAIS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <FG label="TWITTER/X">
              <Input value={form.social_links?.twitter||""} onChange={e => setForm(f => ({...f, social_links:{...f.social_links, twitter:e.target.value}}))} placeholder="@usuario"/>
            </FG>
            <FG label="INSTAGRAM">
              <Input value={form.social_links?.instagram||""} onChange={e => setForm(f => ({...f, social_links:{...f.social_links, instagram:e.target.value}}))} placeholder="@usuario"/>
            </FG>
            <FG label="LINKEDIN">
              <Input value={form.social_links?.linkedin||""} onChange={e => setForm(f => ({...f, social_links:{...f.social_links, linkedin:e.target.value}}))} placeholder="username"/>
            </FG>
            <FG label="WEBSITE">
              <Input value={form.social_links?.website||""} onChange={e => setForm(f => ({...f, social_links:{...f.social_links, website:e.target.value}}))} placeholder="https://..."/>
            </FG>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
          <Btn variant="primary" onClick={save} disabled={!form.name?.trim()}>
            <Save size={13}/>{modal === "edit" ? "Salvar" : "Criar Convidado"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
function SessionCard({ session:s, onEdit, onDel, guests, episodes, compact=false }) {
  const ep = episodes.find(e => e.id === s.episode_id);
  const guestNames = (s.guest_ids||[]).map(id => guests.find(g=>g.id===id)?.name).filter(Boolean);
  const st = SESSION_STATUS[s.status];

  if (compact) {
    return (
      <div style={{ background:T.z800, border:`1px solid ${T.z700}`, borderLeft:`3px solid ${st?.color||T.acc}`,
        borderRadius:8, padding:"10px 12px", marginBottom:8 }} onClick={() => onEdit(s)}
        onMouseEnter={e => e.currentTarget.style.background = T.z750}
        onMouseLeave={e => e.currentTarget.style.background = T.z800}
        style1={{ cursor:"pointer", background:T.z800, border:`1px solid ${T.z700}`,
          borderLeft:`3px solid ${st?.color||T.acc}`, borderRadius:8, padding:"10px 12px",
          marginBottom:8, transition:"background 0.1s" }}>
        <div style={{ fontWeight:500, fontSize:12, color:T.z100, marginBottom:4 }}>{s.title}</div>
        <div style={{ fontSize:11, color:T.z600 }}>{s.date} · {s.time} · {s.duration_min}min</div>
        <div style={{ marginTop:4 }}><StatusBadge status={s.status} map={SESSION_STATUS}/></div>
      </div>
    );
  }

  return (
    <Card hover style={{ marginBottom:10, cursor:"default" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:st?.color||T.acc, flexShrink:0, marginTop:4 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, color:T.z100, marginBottom:7 }}>{s.title}</div>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:8 }}>
            <StatusBadge status={s.status} map={SESSION_STATUS}/>
            {ep && <Badge color={T.z400} bg={`${T.z400}15`}>{ep.title.slice(0,30)}</Badge>}
          </div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", fontSize:12, color:T.z500 }}>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><Calendar size={11}/>{s.date}</span>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><Clock size={11}/>{s.time} · {s.duration_min}min</span>
            {s.location && <span style={{ display:"flex", alignItems:"center", gap:4 }}><Globe size={11}/>{s.location}</span>}
          </div>
          {guestNames.length > 0 && (
            <div style={{ fontSize:11, color:T.z600, marginTop:6 }}>
              <Users size={10} style={{ marginRight:4 }}/>{guestNames.join(", ")}
            </div>
          )}
          {s.notes && (
            <div style={{ fontSize:11, color:T.z600, marginTop:6, fontStyle:"italic" }}>📝 {s.notes}</div>
          )}
        </div>
        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
          <Btn variant="icon" size="sm" onClick={() => onEdit(s)}><Edit3 size={12}/></Btn>
          <Btn variant="icon" size="sm" onClick={() => onDel(s.id)}><Trash2 size={12}/></Btn>
        </div>
      </div>
    </Card>
  );
}

function Schedule() {
  const { data, update } = useApp();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selDay, setSelDay] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const dateStr = (d) =>
    `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const sessionsOnDay = (d) => data.sessions.filter(s => s.date === dateStr(d));

  const blank = () => ({
    id:uid(), episode_id:data.episodes[0]?.id||"", title:"",
    date: selDay ? dateStr(selDay) : "",
    time:"14:00", duration_min:60, guest_ids:[], notes:"",
    status:"scheduled", location:""
  });

  const openCreate = () => { setForm(blank()); setModal("create"); };
  const openEdit = (s) => { setForm({...s, guest_ids:[...(s.guest_ids||[])]}); setModal("edit"); };
  const closeModal = () => setModal(null);

  const save = () => {
    const next = modal === "edit"
      ? data.sessions.map(s => s.id === form.id ? form : s)
      : [...data.sessions, form];
    update("sessions", next); closeModal();
  };

  const del = (id) => update("sessions", data.sessions.filter(s => s.id !== id));

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y-1); }
    else setMonth(m => m-1);
    setSelDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y+1); }
    else setMonth(m => m+1);
    setSelDay(null);
  };

  const upcoming = [...data.sessions]
    .filter(s => s.date >= today.toISOString().split("T")[0])
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 270px", gap:20 }}>
      {/* Main calendar area */}
      <div>
        <PageHeader title="Agenda de Gravações"
          subtitle="Planeje e acompanhe todas as sessões de gravação."
          action={<Btn variant="primary" onClick={openCreate}><Plus size={14}/>Agendar Sessão</Btn>}
        />

        {/* Calendar */}
        <Card style={{ marginBottom:16 }}>
          {/* Month nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <Btn variant="icon" onClick={prevMonth}><ChevronLeft size={16}/></Btn>
            <span style={{ fontWeight:700, color:T.z100, fontSize:15 }}>{MONTH_NAMES[month]} {year}</span>
            <Btn variant="icon" onClick={nextMonth}><ChevronRight size={16}/></Btn>
          </div>

          {/* DOW headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6 }}>
            {DOW.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600,
                color:T.z600, padding:"4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {Array(firstDow).fill(null).map((_,i) => <div key={`e${i}`}/>)}
            {Array(daysInMonth).fill(null).map((_,i) => {
              const day = i + 1;
              const sessions = sessionsOnDay(day);
              const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
              const isSel = selDay === day;

              return (
                <div key={day} onClick={() => setSelDay(isSel ? null : day)}
                  style={{ minHeight:56, padding:"6px 5px", borderRadius:8, cursor:"pointer",
                    textAlign:"center", transition:"all 0.1s",
                    background: isSel ? T.acc : isToday ? T.accD : "transparent",
                    border:`1px solid ${isSel ? T.acc : isToday ? T.accB : "transparent"}` }}
                  onMouseEnter={e => { if (!isSel && !isToday) e.currentTarget.style.background = T.z800; }}
                  onMouseLeave={e => { if (!isSel && !isToday) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ fontSize:13, fontWeight: isToday||isSel ? 700 : 400,
                    color: isSel ? "#fff" : isToday ? T.acc : T.z300 }}>{day}</div>
                  {sessions.length > 0 && (
                    <div style={{ display:"flex", justifyContent:"center", gap:3, marginTop:4, flexWrap:"wrap" }}>
                      {sessions.slice(0,3).map(s => {
                        const sc = SESSION_STATUS[s.status];
                        return <div key={s.id} style={{ width:6, height:6, borderRadius:"50%",
                          background: isSel ? "rgba(255,255,255,0.8)" : sc?.color||T.acc }}/>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected day sessions */}
        {selDay !== null && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.z200 }}>
                {selDay} de {MONTH_NAMES[month]} — {sessionsOnDay(selDay).length} sessão(ões)
              </div>
              <Btn variant="outline" size="sm" onClick={openCreate}><Plus size={12}/>Agendar</Btn>
            </div>
            {sessionsOnDay(selDay).length === 0
              ? <Card><div style={{ textAlign:"center", color:T.z600, fontSize:13, padding:16 }}>Nenhuma sessão neste dia.</div></Card>
              : sessionsOnDay(selDay).map(s => (
                <SessionCard key={s.id} session={s} onEdit={openEdit} onDel={del}
                  guests={data.guests} episodes={data.episodes}/>
              ))
            }
          </div>
        )}

        {/* Legend */}
        <div style={{ display:"flex", gap:14, marginTop:16, flexWrap:"wrap" }}>
          {Object.entries(SESSION_STATUS).map(([k,v]) => (
            <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:v.color }}/>
              <span style={{ fontSize:11, color:T.z500 }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar: upcoming */}
      <div>
        <div style={{ fontSize:14, fontWeight:600, color:T.z200, marginBottom:12, marginTop:62 }}>Próximas Sessões</div>
        {upcoming.length === 0
          ? <div style={{ fontSize:12, color:T.z600 }}>Nenhuma sessão agendada.</div>
          : upcoming.map(s => (
            <SessionCard key={s.id} session={s} compact onEdit={openEdit} onDel={del}
              guests={data.guests} episodes={data.episodes}/>
          ))
        }
      </div>

      {/* Session modal */}
      <Modal open={!!modal} onClose={closeModal}
        title={modal==="edit" ? "Editar Sessão" : "Agendar Nova Sessão"} width={560}>
        <FG label="TÍTULO DA SESSÃO *">
          <Input value={form.title||""} onChange={e => setForm(f => ({...f, title:e.target.value}))} placeholder="Ex: Gravação Ep. 10 — Monetização"/>
        </FG>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <FG label="DATA *"><Input type="date" value={form.date||""} onChange={e => setForm(f => ({...f, date:e.target.value}))}/></FG>
          <FG label="HORÁRIO"><Input type="time" value={form.time||"14:00"} onChange={e => setForm(f => ({...f, time:e.target.value}))}/></FG>
          <FG label="DURAÇÃO (MIN)"><Input type="number" min="15" value={form.duration_min||60} onChange={e => setForm(f => ({...f, duration_min:+e.target.value}))}/></FG>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FG label="EPISÓDIO VINCULADO">
            <Select value={form.episode_id||""} onChange={e => setForm(f => ({...f, episode_id:e.target.value}))}>
              <option value="">— Selecione —</option>
              {data.episodes.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          </FG>
          <FG label="STATUS">
            <Select value={form.status||"scheduled"} onChange={e => setForm(f => ({...f, status:e.target.value}))}>
              {Object.entries(SESSION_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </FG>
        </div>
        <FG label="LOCAL / LINK">
          <Input value={form.location||""} onChange={e => setForm(f => ({...f, location:e.target.value}))} placeholder="Zoom, Riverside, Home Studio, endereço…"/>
        </FG>
        <FG label="CONVIDADOS">
          <GuestCheckList guests={data.guests} selected={form.guest_ids||[]}
            onChange={ids => setForm(f => ({...f, guest_ids:ids}))}/>
        </FG>
        <FG label="NOTAS">
          <Textarea value={form.notes||""} onChange={e => setForm(f => ({...f, notes:e.target.value}))}
            placeholder="Lembretes, materiais necessários…" rows={3}/>
        </FG>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant="ghost" onClick={closeModal}>Cancelar</Btn>
          <Btn variant="primary" onClick={save} disabled={!form.title?.trim()}>
            <Save size={13}/>{modal==="edit" ? "Salvar" : "Agendar"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── SOUNDBOARD COMPONENT ─────────────────────────────────────────────────────
function Soundboard() {
  const [pads, setPads] = useState([
    { id:"p1", name:"Intro Jingle", maxDur:8, file:null, playing:false, color:T.acc },
    { id:"p2", name:"Aplausos",     maxDur:4, file:null, playing:false, color:T.success },
    { id:"p3", name:"Transição",    maxDur:3, file:null, playing:false, color:T.info },
    { id:"p4", name:"Bumper",       maxDur:6, file:null, playing:false, color:T.warn },
    { id:"p5", name:"Efeito 1",     maxDur:2, file:null, playing:false, color:T.v400 },
    { id:"p6", name:"Efeito 2",     maxDur:2, file:null, playing:false, color:T.danger },
  ]);
  const audioRefs = useRef({});

  const handleUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, "").slice(0, 14);
    setPads(prev => prev.map(p => p.id === id ? {...p, file:url, name} : p));
    e.target.value = "";
  };

  const playPad = (id) => {
    const pad = pads.find(p => p.id === id);
    if (!pad?.file) return;
    // stop if already playing
    if (audioRefs.current[id]) {
      audioRefs.current[id].pause();
      audioRefs.current[id].currentTime = 0;
    }
    const audio = new Audio(pad.file);
    audioRefs.current[id] = audio;
    audio.play();
    setPads(prev => prev.map(p => p.id === id ? {...p, playing:true} : p));
    audio.onended = () => setPads(prev => prev.map(p => p.id === id ? {...p, playing:false} : p));
    // auto-stop at maxDur
    setTimeout(() => {
      audio.pause();
      setPads(prev => prev.map(p => p.id === id ? {...p, playing:false} : p));
    }, pad.maxDur * 1000);
  };

  const stopPad = (id) => {
    if (audioRefs.current[id]) {
      audioRefs.current[id].pause();
      audioRefs.current[id].currentTime = 0;
    }
    setPads(prev => prev.map(p => p.id === id ? {...p, playing:false} : p));
  };

  const addPad = () => {
    const colors = [T.acc, T.success, T.info, T.warn, T.v400, T.danger];
    setPads(prev => [...prev, {
      id:uid(), name:`Pad ${prev.length+1}`, maxDur:3,
      file:null, playing:false, color:colors[prev.length % colors.length]
    }]);
  };

  return (
    <Card>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontWeight:600, color:T.z200, fontSize:13 }}>🎚️ Soundboard</div>
        <Btn variant="ghost" size="sm" onClick={addPad}><Plus size={12}/>Pad</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:9 }}>
        {pads.map(pad => (
          <div key={pad.id}
            style={{ background:T.z800, borderRadius:9, padding:12,
              border:`1px solid ${pad.playing ? pad.color : T.z700}`,
              transition:"all 0.15s",
              boxShadow: pad.playing ? `0 0 16px ${pad.color}40` : "none" }}>
            <div style={{ fontWeight:500, color:T.z200, fontSize:12, marginBottom:8,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pad.name}</div>
            <div style={{ display:"flex", gap:5 }}>
              <button
                onClick={() => pad.playing ? stopPad(pad.id) : playPad(pad.id)}
                disabled={!pad.file}
                style={{ flex:1, background: pad.playing ? pad.color : (pad.file ? `${pad.color}22` : T.z700),
                  border:`1px solid ${pad.playing ? pad.color : T.z600}`,
                  color: pad.playing ? "#fff" : (pad.file ? pad.color : T.z500),
                  borderRadius:6, padding:"6px 4px", cursor:pad.file?"pointer":"not-allowed",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:600, fontFamily:"inherit", transition:"all 0.15s" }}>
                {pad.playing ? <><Spinner size={10} color="#fff"/></> : <Play size={12}/>}
              </button>
              <label title="Carregar áudio" style={{ cursor:"pointer" }}>
                <input type="file" accept="audio/*" onChange={e => handleUpload(pad.id, e)}
                  style={{ display:"none" }}/>
                <div style={{ background:T.z700, border:`1px solid ${T.z600}`, borderRadius:6,
                  padding:"6px 8px", display:"flex", alignItems:"center",
                  cursor:"pointer", transition:"background 0.1s" }}>
                  <Upload size={11} color={T.z400}/>
                </div>
              </label>
            </div>
            {!pad.file && (
              <div style={{ fontSize:10, color:T.z600, marginTop:5, textAlign:"center" }}>Sem áudio</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── STUDIO ───────────────────────────────────────────────────────────────────
function Studio() {
  const { data, update, pageParams } = useApp();
  const [selEpId, setSelEpId] = useState(pageParams?.episodeId || data.episodes[0]?.id || "");
  const [micOn, setMicOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState("");

  const streamRef   = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const canvasRef   = useRef(null);
  const animRef     = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);
  const elapsedRef  = useRef(0);

  const fmt = (s) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(buf);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = recording ? T.success : T.acc;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sliceW = W / buf.length;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const y = (buf[i] / 128) * (H / 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.stroke();
    };
    draw();
  }, [recording]);

  const activateMic = async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:false });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setMicOn(true);
      setTimeout(drawWaveform, 100);
    } catch {
      setMicError("Permissão de microfone negada. Habilite o acesso ao microfone nas configurações do navegador.");
    }
  };

  const deactivateMic = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animRef.current);
    audioCtxRef.current?.close();
    setMicOn(false);
    setRecording(false);
    clearInterval(timerRef.current);
    setElapsed(0);
    elapsedRef.current = 0;
    const c = canvasRef.current;
    if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType:"audio/webm" });
    recorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type:"audio/webm" });
      const url  = URL.createObjectURL(blob);
      const newTrack = {
        id:uid(), episode_id:selEpId,
        label:`Gravação — ${new Date().toLocaleTimeString("pt-BR")}`,
        file_url:url,
        file_size_mb:+(blob.size / 1024 / 1024).toFixed(2),
        duration_seconds: elapsedRef.current,
        format:"webm", track_type:"raw",
        participant:"Host", upload_status:"done"
      };
      const next = [...data.audioTracks, newTrack];
      update("audioTracks", next);
    };

    mediaRecorder.start(500); // collect every 500ms
    setRecording(true);
    setElapsed(0);
    elapsedRef.current = 0;
    timerRef.current = setInterval(() => {
      elapsedRef.current++;
      setElapsed(e => e + 1);
    }, 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  useEffect(() => { return () => deactivateMic(); }, []);

  const epTracks = data.audioTracks.filter(t => t.episode_id === selEpId);
  const fmtDur = (s) => { if(!s) return "—"; return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; };

  return (
    <div>
      <PageHeader title="Estúdio Virtual"
        subtitle="Grave, monitore e gerencie faixas de áudio em tempo real."/>

      {/* Episode selector */}
      <div style={{ marginBottom:20 }}>
        <Lbl>EPISÓDIO ATUAL</Lbl>
        <Select value={selEpId} onChange={e => setSelEpId(e.target.value)} style={{ maxWidth:480 }}>
          {data.episodes.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </Select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        {/* Recording module */}
        <Card>
          <div style={{ fontWeight:600, color:T.z200, marginBottom:18, fontSize:14 }}>🎙️ Gravação</div>

          {micError && (
            <div style={{ background:T.dangerD, border:`1px solid ${T.dangerB}`, borderRadius:8,
              padding:"10px 14px", color:T.danger, fontSize:12, marginBottom:14 }}>
              <AlertCircle size={13} style={{ marginRight:6 }}/>{micError}
            </div>
          )}

          {/* Timer */}
          <div style={{ textAlign:"center", marginBottom:22 }}>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:40, fontWeight:700,
              letterSpacing:4, color: recording ? T.success : T.z200, marginBottom:18,
              animation: recording ? "pulse 1.4s ease-in-out infinite" : "none" }}>
              {fmt(elapsed)}
            </div>

            {/* Big record button */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
              <div style={{ width:100, height:100, borderRadius:"50%", cursor:"pointer",
                background: recording ? T.dangerD : micOn ? T.accD : T.z800,
                border:`3px solid ${recording ? T.danger : micOn ? T.acc : T.z700}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.2s",
                boxShadow: recording
                  ? `0 0 0 8px ${T.dangerB}, 0 0 40px ${T.dangerD}`
                  : micOn
                    ? `0 0 0 4px ${T.accB}, 0 0 20px ${T.accD}`
                    : "none",
                animation: recording ? "pulse 1.4s ease-in-out infinite" : "none" }}
                onClick={() => {
                  if (!micOn) activateMic();
                  else if (recording) stopRecording();
                  else startRecording();
                }}>
                {recording
                  ? <StopCircle size={42} color={T.danger}/>
                  : micOn
                    ? <Mic size={42} color={T.acc}/>
                    : <MicOff size={38} color={T.z600}/>
                }
              </div>
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {!micOn ? (
                <Btn variant="primary" onClick={activateMic}><Mic size={14}/>Ativar Microfone</Btn>
              ) : recording ? (
                <Btn variant="danger" onClick={stopRecording}><Square size={14}/>Parar Gravação</Btn>
              ) : (
                <>
                  <Btn variant="success" onClick={startRecording}><PlayCircle size={14}/>Gravar</Btn>
                  <Btn variant="ghost" onClick={deactivateMic}><MicOff size={14}/>Desativar</Btn>
                </>
              )}
            </div>
          </div>

          {/* Waveform canvas */}
          <div style={{ background:T.z800, borderRadius:8, padding:"8px", marginBottom:6, height:76 }}>
            <canvas ref={canvasRef} width={520} height={60} style={{ width:"100%", height:60, display:"block" }}/>
          </div>
          <div style={{ fontSize:11, color:T.z600, textAlign:"center" }}>
            {micOn ? (recording ? "● Gravando — Waveform em tempo real" : "Microfone ativo — clique para gravar") : "Ative o microfone para visualizar a waveform"}
          </div>
        </Card>

        {/* Soundboard */}
        <Soundboard/>
      </div>

      {/* Recorded tracks */}
      <Card>
        <div style={{ fontWeight:600, color:T.z200, marginBottom:16, fontSize:14 }}>
          Faixas do Episódio ({epTracks.length})
        </div>
        {epTracks.length === 0
          ? <Empty icon={Music} message="Nenhuma faixa gravada ainda. Inicie uma gravação acima."/>
          : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {epTracks.map(tr => {
                const tt = TRACK_TYPE[tr.track_type];
                const us = UPLOAD_STATUS[tr.upload_status];
                return (
                  <div key={tr.id} style={{ background:T.z800, borderRadius:9, padding:14,
                    display:"flex", alignItems:"center", gap:16,
                    border:`1px solid ${T.z700}` }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:500, color:T.z100, marginBottom:7 }}>{tr.label}</div>
                      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                        <Badge color={tt?.color||T.z400} bg={`${tt?.color||T.z400}20`}>{tt?.label}</Badge>
                        <Badge color={us?.color||T.z400} bg={`${us?.color||T.z400}20`}>{us?.label}</Badge>
                        <span style={{ fontSize:11, color:T.z600 }}>{tr.format?.toUpperCase()}</span>
                        <span style={{ fontSize:11, color:T.z600 }}>{tr.file_size_mb} MB</span>
                        <span style={{ fontSize:11, color:T.z600 }}>{fmtDur(tr.duration_seconds)}</span>
                      </div>
                    </div>
                    {tr.file_url
                      ? <audio controls src={tr.file_url} style={{ height:32, maxWidth:220 }}/>
                      : <div style={{ fontSize:12, color:T.z600, fontStyle:"italic" }}>Sem arquivo</div>
                    }
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>
    </div>
  );
}

// ─── EDITOR (POST-PRODUCTION) ─────────────────────────────────────────────────
function Editor() {
  const { data, update } = useApp();
  const [selEpId, setSelEpId] = useState(data.episodes[0]?.id || "");
  const [processing, setProcessing] = useState({});

  const epTracks = data.audioTracks.filter(t => t.episode_id === selEpId);
  const fmtDur = (s) => { if(!s) return "—"; return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; };

  const process = (id) => {
    setProcessing(p => ({...p, [id]:0}));
    const interval = setInterval(() => {
      setProcessing(prev => {
        const curr = prev[id] || 0;
        const next = curr + (Math.random() * 8 + 4);
        if (next >= 100) {
          clearInterval(interval);
          const nextTracks = data.audioTracks.map(t => t.id===id ? {...t, track_type:"processed"} : t);
          update("audioTracks", nextTracks);
          const copy = {...prev}; delete copy[id];
          return copy;
        }
        return { ...prev, [id]: Math.min(next, 99) };
      });
    }, 120);
  };

  const markFinal = (id) => {
    const next = data.audioTracks.map(t => t.id===id ? {...t, track_type:"final"} : t);
    update("audioTracks", next);
  };

  const del = (id) => update("audioTracks", data.audioTracks.filter(t => t.id !== id));

  const PROCESS_STEPS = ["Análise do áudio", "Noise reduction", "Normalização de volume", "EQ adaptativo", "Compressão dinâmica", "Exportando…"];

  return (
    <div>
      <PageHeader title="Editor de Pós-Produção"
        subtitle="Processe, melhore e finalize as faixas de áudio dos episódios."/>

      <div style={{ marginBottom:20 }}>
        <Lbl>EPISÓDIO</Lbl>
        <Select value={selEpId} onChange={e => setSelEpId(e.target.value)} style={{ maxWidth:480 }}>
          {data.episodes.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </Select>
      </div>

      {epTracks.length === 0
        ? <Empty icon={Scissors} message="Nenhuma faixa de áudio para este episódio. Grave no estúdio primeiro."/>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {epTracks.map(tr => {
              const tt = TRACK_TYPE[tr.track_type];
              const pct = processing[tr.id];
              const isProcessing = pct !== undefined;

              return (
                <Card key={tr.id}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                    <div style={{ width:48, height:48, borderRadius:10, background:`${tt?.color||T.z400}18`,
                      border:`1px solid ${tt?.color||T.z400}40`, display:"flex", alignItems:"center",
                      justifyContent:"center", flexShrink:0 }}>
                      <MonitorSpeaker size={20} color={tt?.color||T.z400}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, color:T.z100, marginBottom:8 }}>{tr.label}</div>
                      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:12 }}>
                        <Badge color={tt?.color||T.z400} bg={`${tt?.color||T.z400}20`}>{tt?.label}</Badge>
                        <Badge color={UPLOAD_STATUS[tr.upload_status]?.color||T.z400} bg={`${UPLOAD_STATUS[tr.upload_status]?.color||T.z400}20`}>
                          {UPLOAD_STATUS[tr.upload_status]?.label}
                        </Badge>
                        <Badge color={T.z400} bg={`${T.z400}15`}>{tr.format?.toUpperCase()}</Badge>
                        <span style={{ fontSize:11, color:T.z600 }}>{tr.file_size_mb} MB</span>
                        <span style={{ fontSize:11, color:T.z600 }}>{fmtDur(tr.duration_seconds)}</span>
                        <span style={{ fontSize:11, color:T.z600 }}>{tr.participant}</span>
                      </div>

                      {tr.file_url && (
                        <audio controls src={tr.file_url} style={{ width:"100%", height:36, marginBottom:12 }}/>
                      )}

                      {/* Processing progress */}
                      {isProcessing && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11,
                            color:T.z400, marginBottom:6 }}>
                            <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <Spinner size={11}/>
                              {PROCESS_STEPS[Math.floor((pct/100)*PROCESS_STEPS.length)]}
                            </span>
                            <span>{Math.round(pct)}%</span>
                          </div>
                          <div style={{ height:6, background:T.z800, borderRadius:3 }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg, ${T.acc}, ${T.v400})`,
                              borderRadius:3, transition:"width 0.1s" }}/>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", flexDirection:"column", gap:7, flexShrink:0 }}>
                      {tr.track_type === "raw" && (
                        <Btn variant="outline" size="sm" onClick={() => process(tr.id)} disabled={isProcessing}>
                          {isProcessing
                            ? <><Spinner size={12}/>Processando…</>
                            : <><Wand2 size={12}/>Processar</>
                          }
                        </Btn>
                      )}
                      {tr.track_type === "processed" && (
                        <Btn variant="success" size="sm" onClick={() => markFinal(tr.id)}>
                          <Check size={12}/>Marcar Final
                        </Btn>
                      )}
                      {tr.track_type === "final" && (
                        <Btn variant="subtle" size="sm">
                          <Download size={12}/>Exportar
                        </Btn>
                      )}
                      <Btn variant="icon" size="sm" onClick={() => del(tr.id)} title="Remover faixa">
                        <Trash2 size={12}/>
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ─── DISTRIBUTION ─────────────────────────────────────────────────────────────
const DL_DATA = [
  {m:"Set",d:720},{m:"Out",d:1120},{m:"Nov",d:1480},{m:"Dez",d:980},
  {m:"Jan",d:2100},{m:"Fev",d:3240},{m:"Mar",d:4180},
];

function Distribution() {
  const { data } = useApp();
  const [selPodId, setSelPodId] = useState(data.podcasts[0]?.id || "");
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [connected, setConnected] = useState([]);

  const pod = data.podcasts.find(p => p.id === selPodId);
  const podEps = data.episodes.filter(e => e.podcast_id === selPodId);
  const pubEps = podEps.filter(e => e.status === "published");

  const rssUrl = `https://podstudio.app/rss/${selPodId}`;

  const copyRSS = () => {
    navigator.clipboard.writeText(rssUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const connectPlatform = (name) => {
    setConnecting(name);
    setTimeout(() => {
      setConnecting(null);
      setConnected(prev => [...prev, name]);
    }, 2000);
  };

  return (
    <div>
      <PageHeader title="Distribuição"
        subtitle="Gerencie a distribuição do podcast nas principais plataformas."/>

      {/* Podcast selector */}
      <div style={{ marginBottom:20 }}>
        <Lbl>PODCAST</Lbl>
        <Select value={selPodId} onChange={e => setSelPodId(e.target.value)} style={{ maxWidth:400 }}>
          {data.podcasts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <StatCard label="Total Episódios" value={podEps.length} icon={Headphones} color={T.acc}/>
        <StatCard label="Publicados" value={pubEps.length} icon={CheckCircle} color={T.success} delta="ao vivo"/>
        <StatCard label="Em Produção" value={podEps.length - pubEps.length} icon={Layers} color={T.warn}/>
        <StatCard label="Downloads Est." value={(pubEps.length * 2840).toLocaleString("pt-BR")} icon={Download} color={T.info} delta="estimado"/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, marginBottom:20 }}>
        {/* Downloads chart */}
        <Card>
          <div style={{ fontWeight:600, color:T.z200, marginBottom:16, fontSize:14 }}>Downloads por Mês</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DL_DATA} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.z800}/>
              <XAxis dataKey="m" tick={{fill:T.z600,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.z600,fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:T.z800,border:`1px solid ${T.z700}`,borderRadius:8,color:T.z200,fontSize:12}}/>
              <Bar dataKey="d" name="Downloads" fill={T.acc} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* RSS feed */}
        <Card style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontWeight:600, color:T.z200, fontSize:14 }}>Feed RSS</div>

          <div style={{ background:T.z800, border:`1px solid ${T.z700}`, borderRadius:8,
            padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
            <Rss size={16} color={T.acc}/>
            <span style={{ fontSize:11, color:T.z400, flex:1, overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{rssUrl}</span>
          </div>

          <Btn variant={copied ? "success" : "primary"} onClick={copyRSS}
            style={{ justifyContent:"center" }}>
            {copied ? <><Check size={14}/>URL Copiada!</> : <><Copy size={14}/>Copiar URL do RSS</>}
          </Btn>

          <Divider my={0}/>

          <div style={{ fontSize:12, color:T.z500, lineHeight:1.8 }}>
            <div><span style={{ color:T.z400 }}>Podcast:</span> {pod?.title}</div>
            <div><span style={{ color:T.z400 }}>Idioma:</span> {pod?.language}</div>
            <div><span style={{ color:T.z400 }}>Categoria:</span> {pod?.category}</div>
            <div><span style={{ color:T.z400 }}>Autor:</span> {pod?.author || "—"}</div>
          </div>

          {pod?.website && (
            <a href={pod.website} target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", gap:6, color:T.acc,
                fontSize:12, textDecoration:"none" }}>
              <ExternalLink size={12}/>Visitar site do podcast
            </a>
          )}
        </Card>
      </div>

      {/* Platforms */}
      <Card>
        <div style={{ fontWeight:600, color:T.z200, marginBottom:18, fontSize:14 }}>Plataformas de Distribuição</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {PLATFORMS.map(p => {
            const isConnected = connected.includes(p.name);
            const isConnecting = connecting === p.name;
            return (
              <div key={p.name}
                style={{ background:T.z800, borderRadius:10, padding:16,
                  display:"flex", alignItems:"center", gap:12,
                  border:`1px solid ${isConnected ? `${p.color}40` : T.z700}`,
                  transition:"all 0.15s", cursor:"pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = T.z750; e.currentTarget.style.borderColor = `${p.color}40`; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.z800; e.currentTarget.style.borderColor = isConnected ? `${p.color}40` : T.z700; }}>
                <div style={{ fontSize:26 }}>{p.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:T.z100 }}>{p.name}</div>
                  <div style={{ fontSize:11, marginTop:3,
                    color: isConnected ? T.success : T.z600 }}>
                    {isConnected ? "✓ Conectado" : "Não conectado"}
                  </div>
                </div>
                {isConnected
                  ? <CheckCircle size={16} color={T.success}/>
                  : isConnecting
                    ? <Spinner size={16}/>
                    : (
                      <Btn variant="ghost" size="sm" onClick={() => connectPlatform(p.name)}>
                        Conectar
                      </Btn>
                    )
                }
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function PageSettings() {
  const { data, update } = useApp();
  const [userForm, setUserForm] = useState({...data.user});
  const [saved, setSaved] = useState(false);

  const saveUser = () => {
    update("user", userForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const clearAll = () => {
    if (!confirm("Isso vai apagar todos os dados e restaurar os dados de exemplo. Continuar?")) return;
    Object.values(SK).forEach(k => window.storage.delete(k).catch(() => {}));
    window.location.reload();
  };

  return (
    <div style={{ maxWidth:640 }}>
      <PageHeader title="Configurações"/>

      {/* User profile */}
      <Card style={{ marginBottom:18 }}>
        <div style={{ fontWeight:600, color:T.z200, marginBottom:18, fontSize:14 }}>Perfil do Usuário</div>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
          <Avatar name={data.user?.full_name} size={56} color={T.v500}/>
          <div>
            <div style={{ fontWeight:700, fontSize:17, color:T.z50 }}>{data.user?.full_name}</div>
            <div style={{ fontSize:13, color:T.z500, marginTop:2 }}>{data.user?.email}</div>
            <div style={{ marginTop:6 }}>
              <Badge color={T.acc} bg={T.accD}>{data.user?.role === "admin" ? "Administrador" : "Usuário"}</Badge>
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <FG label="NOME COMPLETO">
            <Input value={userForm.full_name||""} onChange={e => setUserForm(f => ({...f, full_name:e.target.value}))}/>
          </FG>
          <FG label="E-MAIL">
            <Input value={userForm.email||""} onChange={e => setUserForm(f => ({...f, email:e.target.value}))}/>
          </FG>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant={saved?"success":"primary"} onClick={saveUser}>
            {saved ? <><Check size={13}/>Salvo!</> : <><Save size={13}/>Salvar Perfil</>}
          </Btn>
        </div>
      </Card>

      {/* About */}
      <Card style={{ marginBottom:18 }}>
        <div style={{ fontWeight:600, color:T.z200, marginBottom:16, fontSize:14 }}>Sobre o PodStudio</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            ["Versão",     "1.0.0"],
            ["Framework",  "React 18 + Context API"],
            ["Backend",    "Base44 BaaS"],
            ["Build",      new Date().toLocaleDateString("pt-BR")],
            ["Entidades",  "6 (Podcast, Episode, Guest…)"],
            ["Páginas",    "10 páginas completas"],
          ].map(([k,v]) => (
            <div key={k} style={{ background:T.z800, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:10, color:T.z600, fontWeight:600, letterSpacing:"0.04em" }}>{k.toUpperCase()}</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.z100, marginTop:3 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <div style={{ fontWeight:600, color:T.z200, marginBottom:14, fontSize:14 }}>Gerenciamento de Dados</div>
        <p style={{ fontSize:13, color:T.z500, marginBottom:16, lineHeight:1.6 }}>
          Todos os dados são armazenados localmente via Storage. Você pode exportar ou limpar os dados a qualquer momento.
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="subtle" onClick={() => {
            const blob = new Blob([JSON.stringify({
              podcasts:data.podcasts, episodes:data.episodes, guests:data.guests,
              scripts:data.scripts, audioTracks:data.audioTracks, sessions:data.sessions
            }, null, 2)], {type:"application/json"});
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `podstudio-export-${Date.now()}.json`;
            a.click();
          }}><Download size={13}/>Exportar Dados</Btn>
          <Btn variant="danger" onClick={clearAll}><Trash2 size={13}/>Restaurar Dados de Exemplo</Btn>
          <Btn variant="ghost" onClick={() => {}} style={{ marginLeft:"auto" }}>
            <LogOut size={13}/>Sair da Conta
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── PAGE ROUTER ──────────────────────────────────────────────────────────────
const PAGE_MAP = {
  dashboard:    Dashboard,
  podcasts:     Podcasts,
  episodes:     Episodes,
  scripts:      Scripts,
  guests:       Guests,
  schedule:     Schedule,
  studio:       Studio,
  editor:       Editor,
  distribution: Distribution,
  settings:     PageSettings,
};

function Router() {
  const { page } = useApp();
  const PageComp = PAGE_MAP[page] || Dashboard;
  return <PageComp/>;
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]           = useState("dashboard");
  const [pageParams, setPageParams] = useState({});
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    loadAll().then(d => { setData(d); setLoading(false); });
  }, []);

  const update = useCallback((entity, items) => {
    setData(prev => ({ ...prev, [entity]:items }));
    persist(entity, items);
  }, []);

  const go = useCallback((p, params = {}) => {
    setPage(p);
    setPageParams(params);
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", background:T.z950, flexDirection:"column", gap:16 }}>
      <div style={{ width:50, height:50, borderRadius:13,
        background:`linear-gradient(135deg, ${T.v600}, ${T.v400})`,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:`0 8px 30px ${T.accB}` }}>
        <Headphones size={24} color="#fff"/>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, color:T.z500, fontSize:13 }}>
        <Spinner size={16}/> Carregando PodStudio…
      </div>
    </div>
  );

  const ctx = { data, update, go, page, pageParams };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        ${CSS_VARS}
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:${T.z950}; color:${T.z50}; font-family:'Outfit',system-ui,sans-serif; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${T.z700}; border-radius:3px; }
        input, textarea, select { color-scheme:dark; font-family:'Outfit',system-ui,sans-serif; }
        input::placeholder, textarea::placeholder { color:${T.z600}; }
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        audio { accent-color:${T.acc}; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:T.z950, overflow:"hidden" }}>
        <Sidebar/>
        <main style={{ flex:1, overflowY:"auto", background:T.z950 }}>
          <div style={{ padding:"28px 28px 40px", maxWidth:1300, margin:"0 auto",
            animation:"fadeUp 0.22s ease both" }}>
            <Router/>
          </div>
        </main>
      </div>
    </AppCtx.Provider>
  );
}
