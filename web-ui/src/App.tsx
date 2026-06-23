import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, LayoutDashboard, Moon, Power, Settings, Sun, Hammer, KeyRound, MessageCircle, FileCode2, Network, ExternalLink, RefreshCw, Rocket, Wrench } from "lucide-react";
import * as api from "@/api/client";

type Theme = "dark" | "light";
type Route = "overview" | "settings" | "relay";

const routes = [
  { id: "overview" as Route, label: "概览", icon: LayoutDashboard },
  { id: "relay" as Route, label: "供应商配置", icon: KeyRound },
  { id: "settings" as Route, label: "设置", icon: Settings },
];

function loadInitialTheme(): Theme {
  const s = localStorage.getItem("theme");
  if (s === "dark" || s === "light") return s;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function App() {
  const [theme, setTheme] = useState<Theme>(loadInitialTheme);
  const [route, setRoute] = useState<Route>("overview");

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const nav = (r: Route) => setRoute(r);

  const sidebar = (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-mark">⚡</div>
        <div className="brand-copy">
          <span className="brand-title">Codex++</span>
          <span className="brand-subtitle">管理工具</span>
        </div>
      </div>
      <nav className="nav">
        {routes.map((r) => (
          <button key={r.id} className={`nav-item${route === r.id ? " active" : ""}`} onClick={() => nav(r.id)} type="button">
            <r.icon className="nav-icon" size={18} />
            <span className="nav-label">{r.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  const overviewScreen = (
    <div className="screen">
      <Card>
        <CardHeader><CardTitle>Codex++ Web</CardTitle><CardDescription>管理工具</CardDescription></CardHeader>
        <CardContent>
          <p>供应商配置、会话管理、LLM 切换</p>
          <div className="toolbar"><Button onClick={() => nav("relay")}><KeyRound size={14} /> 供应商配置</Button></div>
        </CardContent>
      </Card>
    </div>
  );

  const relayScreen = (
    <div className="screen">
      <Card>
        <CardHeader><CardTitle>供应商配置</CardTitle><CardDescription>管理 LLM 供应商</CardDescription></CardHeader>
        <CardContent><p>配置页面</p></CardContent>
      </Card>
    </div>
  );

  const settingsScreen = (
    <div className="screen">
      <Card>
        <CardHeader><CardTitle>设置</CardTitle></CardHeader>
        <CardContent><p>设置页面</p></CardContent>
      </Card>
    </div>
  );

  const content = () => {
    switch (route) {
      case "overview": return overviewScreen;
      case "relay": return relayScreen;
      case "settings": return settingsScreen;
      default: return <div className="screen"><Card><CardContent><p>开发中</p></CardContent></Card></div>;
    }
  };

  return (
    <div className={`shell ${theme}`}>
      {sidebar}
      <div className="workspace">
        <div className="topbar">
          <h1>{routes.find((r) => r.id === route)?.label || "Codex++"}</h1>
          <div className="topbar-actions">
            <button className="btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} type="button">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        {content()}
      </div>
    </div>
  );
}
