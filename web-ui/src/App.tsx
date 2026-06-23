import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  CircleArrowUp,
  Copy,
  Download,
  Edit3,
  GripVertical,
  Info,
  ExternalLink,
  Hammer,
  KeyRound,
  LayoutDashboard,
  MessageCircle,
  FileCode2,
  Moon,
  Network,
  Power,
  PowerOff,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Sun,
  TestTube,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ProviderPresetSelector } from "@/components/ProviderPresetSelector";
import type { PresetPatch } from "@/components/ProviderPresetSelector";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ── Web API client (replaces Tauri invoke) ──
import * as api from "@/api/client";

type Status = "ok" | "failed" | "not_implemented" | "not_checked" | string;

type CommandResult<T> = T & {
  status: Status;
  message: string;
};

type PathState = {
  status: string;
  path: string | null;
};

type LaunchStatus = {
  status: string;
  message: string;
  started_at_ms: number;
  debug_port: number | null;
  helper_port: number | null;
  codex_app: string | null;
};

type OverviewResult = CommandResult<{
  codex_app: PathState;
  codex_version: string | null;
  silent_shortcut: PathState;
  management_shortcut: PathState;
  latest_launch: LaunchStatus | null;
  current_version: string;
  update_status: string;
  settings_path: string;
  logs_path: string;
}>;

type PluginMarketplaceRepairResult = CommandResult<{
  codexHome: string;
  marketplaceRoot?: string | null;
  initialized: boolean;
  configured: boolean;
  needsRepair: boolean;
}>;

type PluginMarketplaceStatusResult = CommandResult<{
  codexHome: string;
  marketplaceRoot?: string | null;
  configRegistered: boolean;
  needsRepair: boolean;
}>;

type BackendSettings = {
  codexAppPath: string;
  codexExtraArgs: string[];
  providerSyncEnabled: boolean;
  providerSyncSavedProviders: string[];
  providerSyncManualProviders: string[];
  providerSyncLastSelectedProvider: string;
  relayProfilesEnabled: boolean;
  enhancementsEnabled: boolean;
  computerUseGuardEnabled: boolean;
  codexAppPluginEntryUnlock: boolean;
  codexAppPluginMarketplaceUnlock: boolean;
  codexAppForcePluginInstall: boolean;
  codexAppModelWhitelistUnlock: boolean;
  codexAppSessionDelete: boolean;
  codexAppMarkdownExport: boolean;
  codexAppPasteFix: boolean;
  codexAppProjectMove: boolean;
  codexAppConversationTimeline: boolean;
  codexAppThreadIdBadge: boolean;
  codexAppConversationView: boolean;
  codexAppThreadScrollRestore: boolean;
  codexAppZedRemoteOpen: boolean;
  zedRemoteOpenStrategy: string;
  zedRemoteProjectRegistryEnabled: boolean;
  zedRemoteSyncToZedSettings: boolean;
  codexAppUpstreamWorktreeCreate: boolean;
  codexAppNativeMenuPlacement: boolean;
  codexAppServiceTierControls: boolean;
  codexAppImageOverlayEnabled: boolean;
  codexAppImageOverlayPath: string;
  codexAppImageOverlayOpacity: number;
  codexGoalsEnabled: boolean;
  mobileControlEnabled: boolean;
  mobileControlRelayUrl: string;
  mobileControlRoom: string;
  mobileControlKey: string;
  launchMode: string;
  relayBaseUrl: string;
  relayApiKey: string;
  relayProfiles: RelayProfile[];
  aggregateRelayProfiles: AggregateRelayProfile[];
  activeAggregateRelayId: string;
  relayCommonConfigContents: string;
  relayContextConfigContents: string;
  activeRelayId: string;
  relayTestModel: string;
  cliWrapperEnabled: boolean;
  cliWrapperBaseUrl: string;
  cliWrapperApiKey: string;
  cliWrapperApiKeyEnv: string;
};

type RelayProtocol = "responses" | "chatCompletions";
type RelayMode = "official" | "mixedApi" | "pureApi" | "aggregate";

type RelayProfile = {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  upstreamBaseUrl: string;
  apiKey: string;
  protocol: RelayProtocol;
  relayMode: RelayMode;
  officialMixApiKey: boolean;
  testModel: string;
  configContents: string;
  authContents: string;
  useCommonConfig: boolean;
  contextSelection: RelayContextSelection;
  contextSelectionInitialized: boolean;
  contextWindow: string;
  autoCompactLimit: string;
  modelList: string;
  userAgent: string;
  aggregate?: RelayAggregateConfig | null;
};

type RelayAggregateStrategy = "failover" | "conversationRoundRobin" | "requestRoundRobin" | "weightedRoundRobin";
type RelayAggregateMember = { profileId: string; weight: number };
type RelayAggregateConfig = { strategy: RelayAggregateStrategy; members: RelayAggregateMember[] };
type AggregateRelayMember = { relayId: string; weight: number };
type AggregateRelayProfile = { id: string; name: string; strategy: RelayAggregateStrategy; members: AggregateRelayMember[] };
type RelayContextSelection = { mcpServers: string[]; skills: string[]; plugins: string[] };
type ContextKind = "mcp" | "skill" | "plugin";
type CodexContextEntry = { id: string; kind: ContextKind; title: string; summary: string; tomlBody: string; enabled: boolean };
type CodexContextEntries = { mcpServers: CodexContextEntry[]; skills: CodexContextEntry[]; plugins: CodexContextEntry[] };

const PROTOCOL_PROXY_BASE_URL = "http://127.0.0.1:57321/v1";
const CHAT_UPSTREAM_BASE_URL_KEY = "codex_plus_chat_base_url";
const SCRIPT_MARKET_REPOSITORY_URL = "https://github.com/BigPizzaV3/CodexPlusPlusScriptMarket";
const LOCAL_MOBILE_RELAY_URL = "ws://127.0.0.1:57323";
const PUBLIC_MOBILE_RELAY_URL = "ws://154.201.90.76:57323";

const mobileRelayServers = [
  { id: "local", label: "本机测试", url: LOCAL_MOBILE_RELAY_URL, capacity: 100 },
  { id: "public-154", label: "公共服务器 1", url: PUBLIC_MOBILE_RELAY_URL, capacity: 100 },
];

const emptyContextSelection = (): RelayContextSelection => ({ mcpServers: [], skills: [], plugins: [] });

type UserScriptInventory = {
  enabled?: boolean;
  scripts?: Array<{
    key: string;
    name: string;
    source: string;
    enabled: boolean;
    status: string;
    error: string;
    market_id?: string;
    version?: string;
    installed?: boolean;
    source_url?: string;
    homepage?: string;
  }>;
};

type SettingsResult = { settings: BackendSettings; settings_path: string; user_scripts: UserScriptInventory } & CommandResult<Record<string, unknown>>;
type RelayResult = CommandResult<{ authenticated: boolean; authSource: string; accountLabel: string | null; configPath: string; configured: boolean; requiresOpenaiAuth: boolean; hasBearerToken: boolean; backupPath: string | null }>;
type RelayPayload = Omit<RelayResult, "status" | "message">;
type RelayFilesResult = CommandResult<{ configPath: string; authPath: string; configContents: string; authContents: string }>;

type LocalSession = { id: string; title: string; cwd: string; modelProvider: string; archived: boolean; updatedAtMs: number | null; rolloutPath: string; dbPath: string };
type LocalSessionsResult = CommandResult<{ dbPath: string; dbPaths: string[]; sessions: LocalSession[] }>;

type ZedRemoteProject = { id: string; label: string; hostId: string; ssh: { user: string; host: string; port: number | null }; path: string; url: string; source: string; lastOpenedAtMs: number | null; isCurrent: boolean };
type ZedRemoteProjectsResult = CommandResult<{ projects: ZedRemoteProject[] }>;
type ZedRemoteOpenResult = CommandResult<{ url: string; strategy: string }>;
type DeleteLocalSessionResult = CommandResult<{ status: string; session_id: string; message: string; undo_token: string | null; backup_path: string | null }>;
type ContextEntriesResult = CommandResult<{ settings: BackendSettings; entries: CodexContextEntries }>;
type LiveContextEntriesResult = CommandResult<{ entries: CodexContextEntries }>;
type ExtractRelayCommonConfigResult = CommandResult<{ commonConfigContents: string; profileConfigContents: string }>;
type RelaySwitchResult = CommandResult<{ settings: BackendSettings; settingsPath: string; user_scripts: unknown; relay: RelayPayload }>;
type SettingsBackfillResult = CommandResult<{ settings: BackendSettings }>;
type RelayProfileTestResult = CommandResult<{ httpStatus: number; endpoint: string; responsePreview: string }>;
type RelayProfileModelsResult = CommandResult<{ models: string[]; endpoint: string }>;
type CcsProviderImport = { sourceId: string; name: string; baseUrl: string; apiKey: string; protocol: RelayProtocol; configContents: string; authContents: string };
type CcsProvidersResult = CommandResult<{ dbPath: string; providers: CcsProviderImport[] }>;
type EnvConflict = { name: string; source: "process" | "user" | string; valuePresent: boolean };
type EnvConflictsResult = CommandResult<{ conflicts: EnvConflict[] }>;
type RemoveEnvConflictsResult = CommandResult<{ removed: string[]; backupPath: string; remaining: EnvConflict[] }>;
type LogsResult = CommandResult<{ path: string; text: string; lines: number }>;
type DiagnosticsResult = CommandResult<{ report: string }>;
type WatcherResult = CommandResult<{ enabled: boolean }>;
type UpdateResult = CommandResult<{ updateAvailable: boolean; latestVersion?: string; assetName?: string; assetUrl?: string; releaseSummary?: string }>;
type InstallResult = CommandResult<Record<string, unknown>>;
type AdItem = { id: string; title: string; description: string; url: string; image_url?: string; tags: string[] };
type AdsResult = CommandResult<{ version: number; ads: AdItem[] }>;

type ProviderSyncTargetSource = "config" | "rollout" | "sqlite" | "manual";
type ProviderSyncTargetOption = { provider: string; lastSelectedAtMs: number; isCurrentProvider: boolean; sources: ProviderSyncTargetSource[] };
type ProviderSyncTargetsResult = CommandResult<{ targets: ProviderSyncTargetOption[] }>;
type ProviderSyncPayload = { changedSessionFiles: number; sqliteRowsUpdated: number; targetProvider: string; skippedLockedRolloutFiles?: string[] };
type ProviderSyncProgress = { active: boolean; percent: number; message: string; result: ProviderSyncPayload | null };
type TaskProgress = { active: boolean; percent: number; message: string };

type ScriptMarketItem = {
  id: string; name: string; description: string; version: string; author: string; tags: string[];
  homepage: string; script_url: string; sha256: string; installed: boolean; installedVersion: string; updateAvailable: boolean;
};
type ScriptMarketResult = CommandResult<{ market: { status: string; message: string; indexUrl: string; updatedAt: string; scripts: ScriptMarketItem[] }; user_scripts: UserScriptInventory }>;

function providerSyncProgressMessage(result: CommandResult<ProviderSyncPayload>): string {
  const changed = result.changedSessionFiles ?? 0;
  const rows = result.sqliteRowsUpdated ?? 0;
  const target = result.targetProvider || "当前 provider";
  const skipped = result.skippedLockedRolloutFiles?.length ?? 0;
  const skippedText = skipped ? `，跳过 ${skipped} 个占用文件` : "";
  return `已同步到 ${target}：修复 ${changed} 个会话文件，更新 ${rows} 行索引${skippedText}。`;
}

const providerSyncSourceLabels: Record<ProviderSyncTargetSource, string> = { config: "配置", rollout: "会话", sqlite: "索引", manual: "手动" };

function providerSyncTargetLabel(target: ProviderSyncTargetOption): string {
  const labels = target.sources.map((source) => providerSyncSourceLabels[source]).filter(Boolean);
  const current = target.isCurrentProvider ? ["当前"] : [];
  return [...labels, ...current].join(" / ") || "发现";
}

function syncMarketInstalledState(current: ScriptMarketResult | null, userScripts: UserScriptInventory): ScriptMarketResult | null {
  if (!current) return current;
  const installed = new Map(
    (userScripts.scripts ?? []).filter((s) => s.market_id).map((s) => [s.market_id || "", s.version || ""]),
  );
  return {
    ...current,
    user_scripts: userScripts,
    market: {
      ...current.market,
      scripts: current.market.scripts.map((script) => {
        const installedVersion = installed.get(script.id) || "";
        return { ...script, installed: Boolean(installedVersion), installedVersion, updateAvailable: Boolean(installedVersion) && installedVersion !== script.version };
      }),
    },
  };
}

type Route = "overview" | "relay" | "mobileControl" | "sessions" | "context" | "enhance" | "zedRemote" | "userScripts" | "recommendations" | "maintenance" | "about" | "settings";
type Theme = "dark" | "light";

const routes: Array<{ id: Route; label: string; icon: LucideIcon; badge?: string }> = [
  { id: "overview", label: "概览", icon: LayoutDashboard },
  { id: "relay", label: "供应商配置", icon: KeyRound },
  { id: "mobileControl", label: "手机控制", icon: MessageCircle, badge: "测试版" },
  { id: "sessions", label: "会话管理", icon: MessageCircle },
  { id: "context", label: "工具与插件", icon: Network },
  { id: "enhance", label: "页面增强", icon: Hammer },
  { id: "zedRemote", label: "Zed 远程项目", icon: ExternalLink },
  { id: "userScripts", label: "脚本市场", icon: FileCode2 },
  { id: "recommendations", label: "推荐内容", icon: ExternalLink },
  { id: "maintenance", label: "安装维护", icon: Wrench },
  { id: "about", label: "关于", icon: Info },
  { id: "settings", label: "设置", icon: Settings },
];

const defaultSettings: BackendSettings = {
  codexAppPath: "", codexExtraArgs: [], providerSyncEnabled: false, providerSyncSavedProviders: [], providerSyncManualProviders: [],
  providerSyncLastSelectedProvider: "", relayProfilesEnabled: true, enhancementsEnabled: true, computerUseGuardEnabled: false,
  codexAppPluginEntryUnlock: true, codexAppPluginMarketplaceUnlock: true, codexAppForcePluginInstall: true, codexAppModelWhitelistUnlock: true,
  codexAppSessionDelete: true, codexAppMarkdownExport: true, codexAppPasteFix: false, codexAppProjectMove: true, codexAppConversationTimeline: true,
  codexAppThreadIdBadge: false, codexAppConversationView: false, codexAppThreadScrollRestore: true, codexAppZedRemoteOpen: true,
  zedRemoteOpenStrategy: "addToFocusedWorkspace", zedRemoteProjectRegistryEnabled: true, zedRemoteSyncToZedSettings: false,
  codexAppUpstreamWorktreeCreate: true, codexAppNativeMenuPlacement: true, codexAppServiceTierControls: false, codexAppImageOverlayEnabled: false,
  codexAppImageOverlayPath: "", codexAppImageOverlayOpacity: 35, codexGoalsEnabled: false, mobileControlEnabled: false,
  mobileControlRelayUrl: LOCAL_MOBILE_RELAY_URL, mobileControlRoom: "", mobileControlKey: "", launchMode: "patch", relayBaseUrl: "", relayApiKey: "",
  relayProfiles: [{ id: "default", name: "默认中转", model: "", baseUrl: "", upstreamBaseUrl: "", apiKey: "", protocol: "responses", relayMode: "official", officialMixApiKey: false, testModel: "", configContents: "", authContents: "", useCommonConfig: true, contextSelection: emptyContextSelection(), contextSelectionInitialized: true, contextWindow: "", autoCompactLimit: "", modelList: "", userAgent: "" }],
  relayCommonConfigContents: "", relayContextConfigContents: "", activeRelayId: "default", aggregateRelayProfiles: [], activeAggregateRelayId: "",
  relayTestModel: "gpt-5.4-mini", cliWrapperEnabled: false, cliWrapperBaseUrl: "", cliWrapperApiKey: "", cliWrapperApiKeyEnv: "CUSTOM_OPENAI_API_KEY",
};

// ── Helper utilities ──

function loadInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadInitialRoute(): Route {
  const hash = location.hash.replace("#", "") as Route;
  if (routes.some((r) => r.id === hash)) return hash;
  return "overview";
}

function numberOrDefault(raw: string, fallback: number): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function isSuccessStatus(status: Status): boolean {
  return status === "ok" || status === "not_implemented";
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeSettings(settings: BackendSettings): BackendSettings {
  return {
    ...defaultSettings,
    ...settings,
    relayProfiles: settings.relayProfiles.map((p, i) => ({
      ...defaultSettings.relayProfiles[0],
      ...p,
      contextSelection: { ...emptyContextSelection(), ...p.contextSelection },
      contextSelectionInitialized: p.contextSelectionInitialized ?? true,
    })),
  };
}

// ── Toast / Notification system ──
type ToastItem = { id: number; title: string; message: string; status: Status };
let toastCounter = 0;

export function App() {
  const [theme, setTheme] = useState<Theme>(loadInitialTheme);
  const [route, setRoute] = useState<Route>(loadInitialRoute);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notice, setNotice] = useState<{ title: string; message: string; status?: Status } | null>(null);
  const [overview, setOverview] = useState<OverviewResult | null>(null);
  const [settings, setSettings] = useState<SettingsResult | null>(null);
  const [relay, setRelay] = useState<RelayResult | null>(null);
  const [relayFiles, setRelayFiles] = useState<RelayFilesResult | null>(null);
  const [envConflicts, setEnvConflicts] = useState<EnvConflictsResult | null>(null);
  const [ccsProviders, setCcsProviders] = useState<CcsProvidersResult | null>(null);
  const [localSessions, setLocalSessions] = useState<LocalSessionsResult | null>(null);
  const [zedRemoteProjects, setZedRemoteProjects] = useState<ZedRemoteProjectsResult | null>(null);
  const [liveContextEntries, setLiveContextEntries] = useState<CodexContextEntries | null>(null);
  const [logs, setLogs] = useState<LogsResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [watcher, setWatcher] = useState<WatcherResult | null>(null);
  const [update, setUpdate] = useState<UpdateResult | null>(null);
  const [ads, setAds] = useState<AdsResult | null>(null);
  const [scriptMarket, setScriptMarket] = useState<ScriptMarketResult | null>(null);
  const [launchForm, setLaunchForm] = useState({ appPath: "", debugPort: "9229", helperPort: "57321" });
  const prevLaunchStatusRef = useRef<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<BackendSettings>({ ...defaultSettings });
  const [providerSyncProgress, setProviderSyncProgress] = useState<ProviderSyncProgress>({ active: false, percent: 0, message: "尚未运行历史会话修复。", result: null });
  const [pluginMarketplaceProgress, setPluginMarketplaceProgress] = useState<TaskProgress>({ active: false, percent: 0, message: "尚未运行插件市场修复。" });
  const [pluginMarketplacePrompt, setPluginMarketplacePrompt] = useState<PluginMarketplaceStatusResult | null>(null);
  const [providerSyncTargets, setProviderSyncTargets] = useState<ProviderSyncTargetsResult | null>(null);
  const [selectedProviderSyncTarget, setSelectedProviderSyncTarget] = useState("");
  const [removeOwnedData, setRemoveOwnedData] = useState(false);
  const [relaySwitching, setRelaySwitching] = useState(false);

  // ── Theme management ──
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Route hash sync
  useEffect(() => {
    location.hash = route;
  }, [route]);

  // ── Toast helpers ──
  const showToast = (title: string, message: string, status: Status = "ok") => {
    const id = ++toastCounter;
    setToasts((current) => [...current, { id, title, message, status }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  };

  const showNotice = (title: string, message: string, status?: Status) => {
    setNotice({ title, message, status: status || "ok" });
    showToast(title, message, status || "ok");
  };

  const showResultNotice = (label: string, result: CommandResult<any>, opts?: { silentSuccess?: boolean }) => {
    if (isSuccessStatus(result.status) && opts?.silentSuccess) return;
    showNotice(label, result.message, result.status);
  };

  // ── Web API data fetching (replaces Tauri invoke) ──

  const run = async <T,>(task: () => Promise<T>): Promise<T | null> => {
    try {
      return await task();
    } catch (error) {
      showNotice("调用失败", stringifyError(error), "failed");
      return null;
    }
  };

  const refreshOverview = async (silent = false) => {
    const statusResult = await run(() => api.backendStatus());
    if (statusResult) {
      const result: OverviewResult = {
        status: "ok",
        message: "Checked",
        codex_app: { status: "ok", path: null },
        codex_version: null,
        silent_shortcut: { status: "ok", path: null },
        management_shortcut: { status: "ok", path: null },
        latest_launch: statusResult.launchStatus,
        current_version: "1.2.18",
        update_status: "unknown",
        settings_path: "",
        logs_path: "",
      };
      const prev = prevLaunchStatusRef.current;
      const current = result.latest_launch?.status;
      if (prev && prev === "running" && current && (current === "stopped" || current === "failed" || current === "crashed")) {
        showNotice("Codex 意外停止", `进程状态：${current}。是否要重新启动？`, "failed");
      }
      prevLaunchStatusRef.current = current ?? null;
      setOverview(result);
      if (!silent) showResultNotice("概览已检查", result, { silentSuccess: true });
    }
  };

  const refreshSettings = async (silent = false) => {
    const result = await run(() => api.loadSettings());
    if (result) {
      const cmdResult: SettingsResult = { ...result, status: "ok", message: "Settings loaded" };
      setSettings(cmdResult);
      const normalized = normalizeSettings(result.settings);
      setSettingsForm(normalized);
      setLaunchForm((current) => ({ ...current, appPath: current.appPath || result.settings.codexAppPath || "" }));
      if (!silent) showResultNotice("设置已加载", cmdResult, { silentSuccess: true });
      return normalized;
    }
    return null;
  };

  const refreshRelay = async (silent = false) => {
    try {
      const data = await api.backendStatus();
      const result: RelayResult = { status: "ok", message: "OK", authenticated: false, authSource: "", accountLabel: null, configPath: "", configured: false, requiresOpenaiAuth: false, hasBearerToken: false, backupPath: null };
      setRelay(result);
      if (!silent) showResultNotice("登录状态", result, { silentSuccess: true });
    } catch (e) {
      if (!silent) showNotice("登录状态", stringifyError(e), "failed");
    }
  };

  const refreshRelayFiles = async (silent = false) => {
    // Relay files are embedded in settings
    const result: RelayFilesResult = { status: "not_implemented", message: "Web版使用 Settings API 替代", configPath: "", authPath: "", configContents: "", authContents: "" };
    setRelayFiles(result);
    return result;
  };

  const refreshEnvConflicts = async (silent = false) => {
    const result: EnvConflictsResult = { status: "not_implemented", message: "环境变量检测功能在Web版中暂不可用", conflicts: [] };
    setEnvConflicts(result);
    return result;
  };

  const removeEnvConflicts = async (names: string[]) => {
    showNotice("环境变量清理", "Web版暂不支持此功能", "not_implemented");
  };

  const refreshCcsProviders = async (silent = false) => {
    const result: CcsProvidersResult = { status: "not_implemented", message: "cc-switch 导入暂不可用", dbPath: "", providers: [] };
    setCcsProviders(result);
    return result;
  };

  const importCcsProviders = async () => {
    showNotice("cc-switch 导入", "Web版暂不支持此功能", "not_implemented");
  };

  const refreshLocalSessions = async (silent = false) => {
    const result = await run(() => api.listSessions());
    if (result) {
      const mapped: LocalSessionsResult = { status: "ok", message: "OK", dbPath: result.dbPaths?.[0] || "", dbPaths: result.dbPaths || [], sessions: result.sessions || [] };
      setLocalSessions(mapped);
      if (!silent || !isSuccessStatus("ok")) showResultNotice("会话管理", mapped, { silentSuccess: true });
    }
    return null;
  };

  const refreshZedRemoteProjects = async (silent = false) => {
    const result: ZedRemoteProjectsResult = { status: "not_implemented", message: "Zed 远程项目在 Web 版中暂不可用", projects: [] };
    setZedRemoteProjects(result);
    return result;
  };

  const openZedRemoteProject = async (project: ZedRemoteProject, strategy: string = settingsForm.zedRemoteOpenStrategy || "addToFocusedWorkspace") => {
    showNotice("Zed 远程打开", "Web版暂不支持此功能", "not_implemented");
  };

  const forgetZedRemoteProject = async (project: ZedRemoteProject) => {
    showNotice("Zed 远程项目", "Web版暂不支持此功能", "not_implemented");
  };

  const deleteLocalSession = async (session: LocalSession) => {
    const title = session.title || session.id;
    if (!window.confirm(`删除会话"${title}"？此操作会删除本地数据库记录和 rollout 文件，并创建备份。`)) return;
    const result = await run(() => api.deleteSession(session.id));
    if (result) {
      showNotice("会话删除", result.message || "已删除");
      await refreshLocalSessions(true);
    }
  };

  const refreshLiveContextEntries = async (silent = false) => {
    const result: LiveContextEntriesResult = { status: "not_implemented", message: "工具与插件在 Web 版中暂不可用", entries: { mcpServers: [], skills: [], plugins: [] } };
    setLiveContextEntries(result.entries);
    return result;
  };

  const syncLiveContextEntries = async (next: BackendSettings, silent = false) => {
    return null;
  };

  const refreshLogs = async (silent = false) => {
    const result = await run(() => api.getLogs());
    if (result) {
      const logsResult: LogsResult = { status: "ok", message: "Logs loaded", path: result.path, text: result.text, lines: result.lines };
      setLogs(logsResult);
      if (!silent) showResultNotice("日志已刷新", logsResult, { silentSuccess: true });
    }
  };

  const refreshDiagnostics = async (silent = false) => {
    const result: DiagnosticsResult = { status: "not_implemented", message: "诊断功能暂不可用", report: "" };
    setDiagnostics(result);
    if (!silent) showResultNotice("诊断已生成", result, { silentSuccess: true });
  };

  const refreshWatcher = async (silent = false) => {
    const result: WatcherResult = { status: "not_implemented", message: "Watcher 仅桌面版支持", enabled: false };
    setWatcher(result);
    if (!silent) showResultNotice("Watcher 状态", result, { silentSuccess: true });
  };

  const navigate = async (next: Route) => {
    setRoute(next);
    if (next === "overview") await refreshOverview(true);
    if (next === "relay") {
      await refreshSettings(true);
      await refreshRelay(true);
      await refreshRelayFiles(true);
      await refreshEnvConflicts(true);
      await refreshCcsProviders(true);
    }
    if (next === "sessions") {
      await refreshSettings(true);
      await refreshLocalSessions(true);
    }
    if (next === "zedRemote") {
      await refreshSettings(true);
      await refreshZedRemoteProjects(true);
    }
    if (next === "context") {
      await refreshSettings(true);
      await refreshRelayFiles(true);
      await refreshLiveContextEntries(true);
    }
    if (next === "settings") await refreshSettings(true);
    if (next === "userScripts") {
      await refreshSettings(true);
    }
    if (next === "recommendations") {}
    if (next === "about") {
      await refreshOverview(true);
      await refreshLogs(true);
      await refreshDiagnostics(true);
    }
    if (next === "maintenance") {
      await refreshOverview(true);
      await refreshWatcher(true);
    }
  };

  const saveSettingsFn = async () => {
    const next = normalizeSettings(settingsForm);
    const result = await run(() => api.saveSettings(next));
    if (result) {
      const cmdResult: SettingsResult = { ...result, status: "ok", message: "Settings saved" };
      setSettings(cmdResult);
      setSettingsForm(normalizeSettings(result.settings));
      showNotice("设置保存", result.status === "ok" ? "设置已保存" : "保存失败", result.status);
    }
  };

  const saveSettingsValue = async (next: BackendSettings, silent = true) => {
    const normalized = normalizeSettings(next);
    setSettingsForm(normalized);
    const result = await run(() => api.saveSettings(normalized));
    if (result) {
      const cmdResult: SettingsResult = { ...result, status: "ok", message: "Settings saved" };
      setSettings(cmdResult);
      setSettingsForm(normalizeSettings(result.settings));
      if (!silent || result.status !== "ok") showNotice("设置保存", result.status === "ok" ? "设置已保存" : "保存失败", result.status);
    }
  };

  const resetSettings = async () => {
    showNotice("设置重置", "Web版暂不支持此功能", "not_implemented");
  };

  const resetImageOverlaySettings = async () => {
    showNotice("图片覆盖层", "Web版暂不支持此功能", "not_implemented");
  };

  const launch = async () => {
    const result = await run(() => api.launchCodex());
    if (result) {
      showNotice("启动任务", result.message || "已启动", result.status);
    }
  };

  const restart = async () => {
    const result = await run(() => api.restartCodex());
    if (result) {
      showNotice("重启 Codex++", result.message || "已重启", result.status);
    }
  };

  const checkUpdate = async (silent = false) => {
    const result: UpdateResult = { status: "not_implemented", message: "Web版自动更新暂不可用", updateAvailable: false };
    setUpdate(result);
    if (!silent) showNotice("GitHub Release 检查", result.message, result.status);
  };

  const performUpdate = async () => {
    showNotice("更新安装", "Web版暂不支持自动更新", "not_implemented");
  };

  const repairBackend = async () => {
    showNotice("后端修复", "Web版暂不支持此功能", "not_implemented");
  };

  const repairPluginMarketplace = async () => {
    showNotice("插件市场修复", "Web版暂不支持此功能", "not_implemented");
  };

  const checkPluginMarketplacePrompt = async () => {
    return null;
  };

  const installEntrypoints = async () => {
    showNotice("入口安装", "Web版暂不支持此功能", "not_implemented");
  };

  const uninstallEntrypoints = async () => {
    showNotice("入口卸载", "Web版暂不支持此功能", "not_implemented");
  };

  const repairShortcuts = async () => {
    showNotice("快捷方式修复", "Web版暂不支持此功能", "not_implemented");
  };

  const watcherAction = async (command: string) => {
    showNotice("Watcher 操作", "Web版暂不支持此功能", "not_implemented");
  };

  const refreshAds = async (silent = false) => {
    const result: AdsResult = { status: "not_implemented", message: "推荐内容加载暂不可用", version: 0, ads: [] };
    setAds(result);
    if (!silent) showResultNotice("推荐内容", result, { silentSuccess: true });
  };

  const refreshScriptMarket = async (silent = false) => {
    const result: ScriptMarketResult = { status: "not_implemented", message: "Web版暂不支持脚本市场", market: { status: "n/a", message: "N/A", indexUrl: "", updatedAt: "", scripts: [] }, user_scripts: { enabled: true, scripts: [] } };
    setScriptMarket(result);
    if (!silent) showResultNotice("脚本市场", result, { silentSuccess: true });
  };

  const installMarketScript = async (id: string) => {
    showNotice("脚本市场", "Web版暂不支持此功能", "not_implemented");
  };

  const setUserScriptEnabled = async (key: string, enabled: boolean) => {
    showNotice("本地脚本", "Web版暂不支持此功能", "not_implemented");
  };

  const deleteUserScript = async (key: string) => {
    showNotice("本地脚本", "Web版暂不支持此功能", "not_implemented");
  };

  // ── Relay-specific functions ──

  const switchRelayProfile = async (profileId: string) => {
    setRelaySwitching(true);
    try {
      const r = await run(() => api.switchRelayProfile(profileId));
      if (r) {
        showNotice("供应商切换", r.status === "ok" ? "切换成功" : "切换失败", r.status);
        await refreshSettings(true);
      }
    } finally {
      setRelaySwitching(false);
    }
  };

  const applyRelayInjection = async (profileId?: string) => {
    const r = await run(() => api.applyRelayInjection(profileId ? { profileId } : undefined));
    if (r) showNotice("中转注入", r.status === "ok" ? "注入成功" : "注入失败", r.status);
  };

  const clearRelayInjection = async () => {
    const r = await run(() => api.clearRelayInjection());
    if (r) showNotice("清除注入", r.status === "ok" ? "已清除" : "清除失败", r.status);
  };

  const testRelayProfileAction = async (profile: RelayProfile) => {
    const r = await run(() => api.testRelayProfile({ baseUrl: profile.baseUrl, apiKey: profile.apiKey, testModel: profile.testModel }));
    if (r) showNotice("连接测试", r.status === "ok" ? `HTTP ${r.httpStatus}` : r.message, r.status);
  };

  // ── Initial load ──
  useEffect(() => { navigate(route); }, []); // Run once on mount

  // ── Render sidebar ──
  const sidebar = (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-mark">{theme === "dark" ? "🧊" : "⚡"}</div>
        <div className="brand-copy">
          <div className="brand-title-row">
            <span className="brand-title">Codex++</span>
            <span className="update-dot" title="Web 版">🌐</span>
          </div>
          <span className="brand-subtitle">管理工具</span>
        </div>
      </div>
      <nav className="nav">
        {routes.map((r) => (
          <button
            key={r.id}
            className={`nav-item${route === r.id ? " active" : ""}`}
            onClick={() => navigate(r.id)}
            type="button"
          >
            <r.icon className="nav-icon" size={18} />
            <span className="nav-label">{r.label}</span>
            {r.badge && <span className="nav-badge">{r.badge}</span>}
          </button>
        ))}
      </nav>
    </div>
  );

  // Theme toggle
  const themeToggle = (
    <button
      className="btn theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
      type="button"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  // ── Overview screen (simplified) ──
  const overviewScreen = (
    <div className="screen">
      <Card>
        <CardHeader>
          <CardTitle>🌐 Codex++ Web 版</CardTitle>
          <CardDescription>基于 Web 的 Codex 管理工具</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid two">
            <div className="panel">
              <div className="panel-head">
                <Power size={16} />
                <span>启动状态</span>
              </div>
              <div className="status-line">
                <span className={overview?.latest_launch?.status === "running" ? "good" : "warn"}>
                  {overview?.latest_launch?.status || "未检测"}
                </span>
              </div>
              {overview?.latest_launch?.started_at_ms && (
                <div className="metric-list">
                  <div>启动时间: {new Date(overview.latest_launch.started_at_ms).toLocaleString("zh-CN")}</div>
                </div>
              )}
              <div className="toolbar">
                <Button size="sm" onClick={launch}><Rocket size={14} /> 启动</Button>
                <Button size="sm" variant="secondary" onClick={restart}><RefreshCw size={14} /> 重启</Button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <Settings size={16} />
                <span>快速操作</span>
              </div>
              <div className="toolbar">
                <Button size="sm" onClick={() => navigate("relay")}><KeyRound size={14} /> 供应商配置</Button>
                <Button size="sm" onClick={() => navigate("sessions")}><MessageCircle size={14} /> 会话管理</Button>
                <Button size="sm" onClick={() => navigate("enhance")}><Hammer size={14} /> 页面增强</Button>
              </div>
              <div className="hint-line" style={{ marginTop: 12 }}>
                <Info size={14} />
                <span>Web 版的部分功能受限于浏览器环境，部分桌面专属功能暂不可用。</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Settings screen ──
  const settingsScreen = (
    <div className="screen">
      <Card>
        <CardHeader>
          <CardTitle>设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="field">
            <span>Codex 应用路径</span>
            <Input
              value={settingsForm.codexAppPath}
              onChange={(e) => setSettingsForm({ ...settingsForm, codexAppPath: e.target.value })}
              placeholder="例如: /Applications/Codex.app"
            />
          </div>
          <div className="field">
            <span>启动参数</span>
            <Input
              value={settingsForm.codexExtraArgs.join(" ")}
              onChange={(e) => setSettingsForm({ ...settingsForm, codexExtraArgs: e.target.value.split(" ").filter(Boolean) })}
              placeholder="额外命令行参数"
            />
          </div>
          <div className="settings-block">
            <div className="switch-row">
              <strong>供应商配置功能</strong>
              <small>启用后可管理多个 LLM 供应商配置</small>
              <input type="checkbox" checked={settingsForm.relayProfilesEnabled} onChange={(e) => setSettingsForm({ ...settingsForm, relayProfilesEnabled: e.target.checked })} />
            </div>
            <div className="switch-row">
              <strong>页面增强功能</strong>
              <small>启用后注入增强脚本</small>
              <input type="checkbox" checked={settingsForm.enhancementsEnabled} onChange={(e) => setSettingsForm({ ...settingsForm, enhancementsEnabled: e.target.checked })} />
            </div>
          </div>
          <div className="toolbar">
            <Button onClick={saveSettingsFn}><Save size={14} /> 保存设置</Button>
            <Button variant="secondary" onClick={resetSettings}><RefreshCw size={14} /> 重置</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Enhancements screen (simplified) ──
  const enhanceScreen = (
    <div className="screen">
      <Card>
        <CardHeader>
          <CardTitle>页面增强</CardTitle>
          <CardDescription>管理 Codex 页面的增强功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="feature-switch-grid">
            {[
              { key: "codexAppPluginEntryUnlock", label: "插件入口解锁", desc: "解锁 API Key 模式下的插件入口" },
              { key: "codexAppPluginMarketplaceUnlock", label: "插件市场解锁", desc: "解锁插件市场功能" },
              { key: "codexAppForcePluginInstall", label: "强制安装插件", desc: "允许安装不兼容的插件" },
              { key: "codexAppModelWhitelistUnlock", label: "模型白名单解锁", desc: "解除模型选择限制" },
              { key: "codexAppSessionDelete", label: "会话删除", desc: "在会话列表添加删除按钮" },
              { key: "codexAppMarkdownExport", label: "Markdown 导出", desc: "导出会话为 Markdown" },
              { key: "codexAppPasteFix", label: "粘贴修复", desc: "从富文本粘贴时只保留纯文本" },
              { key: "codexAppProjectMove", label: "项目移动", desc: "允许移动项目到不同工作区" },
              { key: "codexAppConversationTimeline", label: "会话时间线", desc: "显示会话时间线视图" },
            ].map((feat) => (
              <div key={feat.key} className="feature-item">
                <div>
                  <strong>{feat.label}</strong>
                  <small>{feat.desc}</small>
                </div>
                <label className="feature-toggle">
                  <input
                    type="checkbox"
                    checked={(settingsForm as any)[feat.key] ?? false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, [feat.key]: e.target.checked })}
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <Button onClick={saveSettingsFn}><Save size={14} /> 保存增强设置</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Sessions screen ──
  const sessionsScreen = (
    <div className="screen">
      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle>会话管理</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => refreshLocalSessions()}><RefreshCw size={14} /> 刷新</Button>
          </div>
        </CardHeader>
        <CardContent>
          {localSessions?.sessions && localSessions.sessions.length > 0 ? (
            <div className="session-list">
              {localSessions.sessions.map((session) => (
                <div key={session.id} className="session-row">
                  <div className="session-main">
                    <strong>{session.title || "未命名会话"}</strong>
                    <span>{session.modelProvider}</span>
                    {session.updatedAtMs && <small>{new Date(session.updatedAtMs).toLocaleString("zh-CN")}</small>}
                  </div>
                  <div className="session-meta">
                    <button className="btn btn-icon" onClick={() => deleteLocalSession(session)} title="删除会话">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <span>暂无本地会话数据</span>
              <small>请确保 Codex 已运行并有本地数据库</small>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ── Logs screen (about page) ──
  const logsScreen = (
    <div className="log-view tall">
      <div className="log-lines">
        {(logs?.text || "暂无日志").split("\n").map((line, i) => (
          <div key={i} className="log-line">
            <code>{line}</code>
          </div>
        ))}
      </div>
    </div>
  );

  // ── About screen ──
  const aboutScreen = (
    <div className="screen">
      <Card>
        <CardHeader>
          <CardTitle>关于</CardTitle>
          <CardDescription>Codex++ Web 管理工具</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="metric-list">
            <div><strong>版本:</strong> 1.2.18</div>
            <div><strong>模式:</strong> Web (Axum + React)</div>
            <div><strong>设置路径:</strong> {settings?.settings_path || "N/A"}</div>
            <div><strong>Codex Home:</strong> {overview?.latest_launch?.codex_app || "N/A"}</div>
          </div>
          <div className="toolbar">
            <Button size="sm" variant="secondary" onClick={() => refreshLogs()}><RefreshCw size={14} /> 刷新日志</Button>
          </div>
          {logs && logsScreen}
        </CardContent>
      </Card>
    </div>
  );

  // ── Content router ──
  const content = () => {
    switch (route) {
      case "overview": return overviewScreen;
      case "settings": return settingsScreen;
      case "enhance": return enhanceScreen;
      case "sessions": return sessionsScreen;
      case "about": return aboutScreen;
      default: return (
        <div className="screen">
          <Card>
            <CardHeader>
              <CardTitle>{routes.find((r) => r.id === route)?.label || route}</CardTitle>
              <CardDescription>此页面在 Web 版中开发中</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="empty">
                <span>功能开发中</span>
                <small>该功能为桌面专属，Web 版适配进行中</small>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  // ── Toast container ──
  const toastContainer = toasts.length > 0 && (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-card${t.status === "failed" ? " failed" : ""}`}>
          <div className="toast-progress" />
          <div className="toast-icon">{t.status === "failed" ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} />}</div>
          <div className="toast-body">
            <h2>{t.title}</h2>
            <p>{t.message}</p>
          </div>
          <button className="toast-close" onClick={() => setToasts((current) => current.filter((x) => x.id !== t.id))} type="button">×</button>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`shell ${theme}`}>
      {sidebar}
      <div className="workspace">
        <div className="topbar">
          <h1>{routes.find((r) => r.id === route)?.label || "Codex++"}</h1>
          <div className="topbar-actions">
            {themeToggle}
          </div>
        </div>
        {content()}
      </div>
      {toastContainer}
    </div>
  );
}
