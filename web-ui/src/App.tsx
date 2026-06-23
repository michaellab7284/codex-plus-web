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
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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

type RelayAggregateStrategy =
    | "failover"
    | "conversationRoundRobin"
    | "requestRoundRobin"
    | "weightedRoundRobin";
type RelayAggregateMember = { profileId: string; weight: number };
type RelayAggregateConfig = {
    strategy: RelayAggregateStrategy;
    members: RelayAggregateMember[];
};
type AggregateRelayMember = { relayId: string; weight: number };
type AggregateRelayProfile = {
    id: string;
    name: string;
    strategy: RelayAggregateStrategy;
    members: AggregateRelayMember[];
};
type RelayContextSelection = {
    mcpServers: string[];
    skills: string[];
    plugins: string[];
};
type ContextKind = "mcp" | "skill" | "plugin";
type CodexContextEntry = {
    id: string;
    kind: ContextKind;
    title: string;
    summary: string;
    tomlBody: string;
    enabled: boolean;
};
type CodexContextEntries = {
    mcpServers: CodexContextEntry[];
    skills: CodexContextEntry[];
    plugins: CodexContextEntry[];
};

const PROTOCOL_PROXY_BASE_URL = "http://127.0.0.1:57321/v1";
const CHAT_UPSTREAM_BASE_URL_KEY = "codex_plus_chat_base_url";
const SCRIPT_MARKET_REPOSITORY_URL =
    "https://github.com/BigPizzaV3/CodexPlusPlusScriptMarket";
const LOCAL_MOBILE_RELAY_URL = "ws://127.0.0.1:57323";
const PUBLIC_MOBILE_RELAY_URL = "ws://154.201.90.76:57323";

const mobileRelayServers = [
    {
        id: "local",
        label: "本机测试",
        url: LOCAL_MOBILE_RELAY_URL,
        capacity: 100,
    },
    {
        id: "public-154",
        label: "公共服务器 1",
        url: PUBLIC_MOBILE_RELAY_URL,
        capacity: 100,
    },
];

const emptyContextSelection = (): RelayContextSelection => ({
    mcpServers: [],
    skills: [],
    plugins: [],
});

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

type SettingsResult = {
    settings: BackendSettings;
    settings_path: string;
    user_scripts: UserScriptInventory;
} & CommandResult<Record<string, unknown>>;
type RelayResult = CommandResult<{
    authenticated: boolean;
    authSource: string;
    accountLabel: string | null;
    configPath: string;
    configured: boolean;
    requiresOpenaiAuth: boolean;
    hasBearerToken: boolean;
    backupPath: string | null;
}>;
type RelayPayload = Omit<RelayResult, "status" | "message">;
type RelayFilesResult = CommandResult<{
    configPath: string;
    authPath: string;
    configContents: string;
    authContents: string;
}>;

type LocalSession = {
    id: string;
    title: string;
    cwd: string;
    modelProvider: string;
    archived: boolean;
    updatedAtMs: number | null;
    rolloutPath: string;
    dbPath: string;
};
type LocalSessionsResult = CommandResult<{
    dbPath: string;
    dbPaths: string[];
    sessions: LocalSession[];
}>;

type ZedRemoteProject = {
    id: string;
    label: string;
    hostId: string;
    ssh: { user: string; host: string; port: number | null };
    path: string;
    url: string;
    source: string;
    lastOpenedAtMs: number | null;
    isCurrent: boolean;
};
type ZedRemoteProjectsResult = CommandResult<{ projects: ZedRemoteProject[] }>;
type ZedRemoteOpenResult = CommandResult<{ url: string; strategy: string }>;
type DeleteLocalSessionResult = CommandResult<{
    status: string;
    session_id: string;
    message: string;
    undo_token: string | null;
    backup_path: string | null;
}>;
type ContextEntriesResult = CommandResult<{
    settings: BackendSettings;
    entries: CodexContextEntries;
}>;
type LiveContextEntriesResult = CommandResult<{ entries: CodexContextEntries }>;
type ExtractRelayCommonConfigResult = CommandResult<{
    commonConfigContents: string;
    profileConfigContents: string;
}>;
type RelaySwitchResult = CommandResult<{
    settings: BackendSettings;
    settingsPath: string;
    user_scripts: unknown;
    relay: RelayPayload;
}>;
type SettingsBackfillResult = CommandResult<{ settings: BackendSettings }>;
type RelayProfileTestResult = CommandResult<{
    httpStatus: number;
    endpoint: string;
    responsePreview: string;
}>;
type RelayProfileModelsResult = CommandResult<{
    models: string[];
    endpoint: string;
}>;
type CcsProviderImport = {
    sourceId: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    protocol: RelayProtocol;
    configContents: string;
    authContents: string;
};
type CcsProvidersResult = CommandResult<{
    dbPath: string;
    providers: CcsProviderImport[];
}>;
type EnvConflict = {
    name: string;
    source: "process" | "user" | string;
    valuePresent: boolean;
};
type EnvConflictsResult = CommandResult<{ conflicts: EnvConflict[] }>;
type RemoveEnvConflictsResult = CommandResult<{
    removed: string[];
    backupPath: string;
    remaining: EnvConflict[];
}>;
type LogsResult = CommandResult<{ path: string; text: string; lines: number }>;
type DiagnosticsResult = CommandResult<{ report: string }>;
type WatcherResult = CommandResult<{ enabled: boolean }>;
type UpdateResult = CommandResult<{
    updateAvailable: boolean;
    latestVersion?: string;
    assetName?: string;
    assetUrl?: string;
    releaseSummary?: string;
}>;
type InstallResult = CommandResult<Record<string, unknown>>;
type AdItem = {
    id: string;
    title: string;
    description: string;
    url: string;
    image_url?: string;
    tags: string[];
};
type AdsResult = CommandResult<{ version: number; ads: AdItem[] }>;

type ProviderSyncTargetSource = "config" | "rollout" | "sqlite" | "manual";
type ProviderSyncTargetOption = {
    provider: string;
    lastSelectedAtMs: number;
    isCurrentProvider: boolean;
    sources: ProviderSyncTargetSource[];
};
type ProviderSyncTargetsResult = CommandResult<{
    targets: ProviderSyncTargetOption[];
}>;
type ProviderSyncPayload = {
    changedSessionFiles: number;
    sqliteRowsUpdated: number;
    targetProvider: string;
    skippedLockedRolloutFiles?: string[];
};
type ProviderSyncProgress = {
    active: boolean;
    percent: number;
    message: string;
    result: ProviderSyncPayload | null;
};
type TaskProgress = { active: boolean; percent: number; message: string };

type ScriptMarketItem = {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    tags: string[];
    homepage: string;
    script_url: string;
    sha256: string;
    installed: boolean;
    installedVersion: string;
    updateAvailable: boolean;
};
type ScriptMarketResult = CommandResult<{
    market: {
        status: string;
        message: string;
        indexUrl: string;
        updatedAt: string;
        scripts: ScriptMarketItem[];
    };
    user_scripts: UserScriptInventory;
}>;

function providerSyncProgressMessage(
    result: CommandResult<ProviderSyncPayload>,
): string {
    const changed = result.changedSessionFiles ?? 0;
    const rows = result.sqliteRowsUpdated ?? 0;
    const target = result.targetProvider || "当前 provider";
    const skipped = result.skippedLockedRolloutFiles?.length ?? 0;
    const skippedText = skipped ? `，跳过 ${skipped} 个占用文件` : "";
    return `已同步到 ${target}：修复 ${changed} 个会话文件，更新 ${rows} 行索引${skippedText}。`;
}

const providerSyncSourceLabels: Record<ProviderSyncTargetSource, string> = {
    config: "配置",
    rollout: "会话",
    sqlite: "索引",
    manual: "手动",
};

function providerSyncTargetLabel(target: ProviderSyncTargetOption): string {
    const labels = target.sources
        .map((source) => providerSyncSourceLabels[source])
        .filter(Boolean);
    const current = target.isCurrentProvider ? ["当前"] : [];
    return [...labels, ...current].join(" / ") || "发现";
}

function syncMarketInstalledState(
    current: ScriptMarketResult | null,
    userScripts: UserScriptInventory,
): ScriptMarketResult | null {
    if (!current) return current;
    const installed = new Map(
        (userScripts.scripts ?? [])
            .filter((s) => s.market_id)
            .map((s) => [s.market_id || "", s.version || ""]),
    );
    return {
        ...current,
        user_scripts: userScripts,
        market: {
            ...current.market,
            scripts: current.market.scripts.map((script) => {
                const installedVersion = installed.get(script.id) || "";
                return {
                    ...script,
                    installed: Boolean(installedVersion),
                    installedVersion,
                    updateAvailable:
                        Boolean(installedVersion) &&
                        installedVersion !== script.version,
                };
            }),
        },
    };
}

type Route =
    | "overview"
    | "relay"
    | "mobileControl"
    | "sessions"
    | "context"
    | "enhance"
    | "zedRemote"
    | "userScripts"
    | "recommendations"
    | "maintenance"
    | "about"
    | "settings";
type Theme = "dark" | "light";

const routes: Array<{
    id: Route;
    label: string;
    icon: LucideIcon;
    badge?: string;
}> = [
    { id: "overview", label: "概览", icon: LayoutDashboard },
    { id: "relay", label: "供应商配置", icon: KeyRound },
    {
        id: "mobileControl",
        label: "手机控制",
        icon: MessageCircle,
        badge: "测试版",
    },
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
    codexAppPath: "",
    codexExtraArgs: [],
    providerSyncEnabled: false,
    providerSyncSavedProviders: [],
    providerSyncManualProviders: [],
    providerSyncLastSelectedProvider: "",
    relayProfilesEnabled: true,
    enhancementsEnabled: true,
    computerUseGuardEnabled: false,
    codexAppPluginEntryUnlock: true,
    codexAppPluginMarketplaceUnlock: true,
    codexAppForcePluginInstall: true,
    codexAppModelWhitelistUnlock: true,
    codexAppSessionDelete: true,
    codexAppMarkdownExport: true,
    codexAppPasteFix: false,
    codexAppProjectMove: true,
    codexAppConversationTimeline: true,
    codexAppThreadIdBadge: false,
    codexAppConversationView: false,
    codexAppThreadScrollRestore: true,
    codexAppZedRemoteOpen: true,
    zedRemoteOpenStrategy: "addToFocusedWorkspace",
    zedRemoteProjectRegistryEnabled: true,
    zedRemoteSyncToZedSettings: false,
    codexAppUpstreamWorktreeCreate: true,
    codexAppNativeMenuPlacement: true,
    codexAppServiceTierControls: false,
    codexAppImageOverlayEnabled: false,
    codexAppImageOverlayPath: "",
    codexAppImageOverlayOpacity: 35,
    codexGoalsEnabled: false,
    mobileControlEnabled: false,
    mobileControlRelayUrl: LOCAL_MOBILE_RELAY_URL,
    mobileControlRoom: "",
    mobileControlKey: "",
    launchMode: "patch",
    relayBaseUrl: "",
    relayApiKey: "",
    relayProfiles: [
        {
            id: "default",
            name: "默认中转",
            model: "",
            baseUrl: "",
            upstreamBaseUrl: "",
            apiKey: "",
            protocol: "responses",
            relayMode: "official",
            officialMixApiKey: false,
            testModel: "",
            configContents: "",
            authContents: "",
            useCommonConfig: true,
            contextSelection: emptyContextSelection(),
            contextSelectionInitialized: true,
            contextWindow: "",
            autoCompactLimit: "",
            modelList: "",
            userAgent: "",
        },
    ],
    relayCommonConfigContents: "",
    relayContextConfigContents: "",
    activeRelayId: "default",
    aggregateRelayProfiles: [],
    activeAggregateRelayId: "",
    relayTestModel: "gpt-5.4-mini",
    cliWrapperEnabled: false,
    cliWrapperBaseUrl: "",
    cliWrapperApiKey: "",
    cliWrapperApiKeyEnv: "CUSTOM_OPENAI_API_KEY",
};

// ── Helper utilities ──

function loadInitialTheme(): Theme {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
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
            contextSelection: {
                ...emptyContextSelection(),
                ...p.contextSelection,
            },
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
    const [notice, setNotice] = useState<{
        title: string;
        message: string;
        status?: Status;
    } | null>(null);
    const [overview, setOverview] = useState<OverviewResult | null>(null);
    const [settings, setSettings] = useState<SettingsResult | null>(null);
    const [relay, setRelay] = useState<RelayResult | null>(null);
    const [relayFiles, setRelayFiles] = useState<RelayFilesResult | null>(null);
    const [envConflicts, setEnvConflicts] = useState<EnvConflictsResult | null>(
        null,
    );
    const [ccsProviders, setCcsProviders] = useState<CcsProvidersResult | null>(
        null,
    );
    const [localSessions, setLocalSessions] =
        useState<LocalSessionsResult | null>(null);
    const [zedRemoteProjects, setZedRemoteProjects] =
        useState<ZedRemoteProjectsResult | null>(null);
    const [liveContextEntries, setLiveContextEntries] =
        useState<CodexContextEntries | null>(null);
    const [logs, setLogs] = useState<LogsResult | null>(null);
    const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(
        null,
    );
    const [watcher, setWatcher] = useState<WatcherResult | null>(null);
    const [update, setUpdate] = useState<UpdateResult | null>(null);
    const [ads, setAds] = useState<AdsResult | null>(null);
    const [scriptMarket, setScriptMarket] = useState<ScriptMarketResult | null>(
        null,
    );
    const [launchForm, setLaunchForm] = useState({
        appPath: "",
        debugPort: "9229",
        helperPort: "57321",
    });
    const prevLaunchStatusRef = useRef<string | null>(null);
    const [settingsForm, setSettingsForm] = useState<BackendSettings>({
        ...defaultSettings,
    });
    const [providerSyncProgress, setProviderSyncProgress] =
        useState<ProviderSyncProgress>({
            active: false,
            percent: 0,
            message: "尚未运行历史会话修复。",
            result: null,
        });
    const [pluginMarketplaceProgress, setPluginMarketplaceProgress] =
        useState<TaskProgress>({
            active: false,
            percent: 0,
            message: "尚未运行插件市场修复。",
        });
    const [pluginMarketplacePrompt, setPluginMarketplacePrompt] =
        useState<PluginMarketplaceStatusResult | null>(null);
    const [providerSyncTargets, setProviderSyncTargets] =
        useState<ProviderSyncTargetsResult | null>(null);
    const [selectedProviderSyncTarget, setSelectedProviderSyncTarget] =
        useState("");
    const [removeOwnedData, setRemoveOwnedData] = useState(false);
    const [relaySwitching, setRelaySwitching] = useState(false);
    const [relayDetailProfileId, setRelayDetailProfileId] = useState<
        string | null
    >(null);
    const [relayNewProfileDraft, setRelayNewProfileDraft] =
        useState<RelayProfile | null>(null);
    const [relayDraftProfile, setRelayDraftProfile] =
        useState<RelayProfile | null>(null);
    const [relayShowAdvanced, setRelayShowAdvanced] = useState(false);

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
    const showToast = (
        title: string,
        message: string,
        status: Status = "ok",
    ) => {
        const id = ++toastCounter;
        setToasts((current) => [...current, { id, title, message, status }]);
        setTimeout(
            () => setToasts((current) => current.filter((t) => t.id !== id)),
            4000,
        );
    };

    const showNotice = (title: string, message: string, status?: Status) => {
        setNotice({ title, message, status: status || "ok" });
        showToast(title, message, status || "ok");
    };

    const showResultNotice = (
        label: string,
        result: CommandResult<any>,
        opts?: { silentSuccess?: boolean },
    ) => {
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
            if (
                prev &&
                prev === "running" &&
                current &&
                (current === "stopped" ||
                    current === "failed" ||
                    current === "crashed")
            ) {
                showNotice(
                    "Codex 意外停止",
                    `进程状态：${current}。是否要重新启动？`,
                    "failed",
                );
            }
            prevLaunchStatusRef.current = current ?? null;
            setOverview(result);
            if (!silent)
                showResultNotice("概览已检查", result, { silentSuccess: true });
        }
    };

    const refreshSettings = async (silent = false) => {
        const result = await run(() => api.loadSettings());
        if (result) {
            const cmdResult: SettingsResult = {
                ...result,
                status: "ok",
                message: "Settings loaded",
            };
            setSettings(cmdResult);
            const normalized = normalizeSettings(result.settings);
            setSettingsForm(normalized);
            setLaunchForm((current) => ({
                ...current,
                appPath: current.appPath || result.settings.codexAppPath || "",
            }));
            if (!silent)
                showResultNotice("设置已加载", cmdResult, {
                    silentSuccess: true,
                });
            return normalized;
        }
        return null;
    };

    const refreshRelay = async (silent = false) => {
        try {
            const data = await api.backendStatus();
            const result: RelayResult = {
                status: "ok",
                message: "OK",
                authenticated: false,
                authSource: "",
                accountLabel: null,
                configPath: "",
                configured: false,
                requiresOpenaiAuth: false,
                hasBearerToken: false,
                backupPath: null,
            };
            setRelay(result);
            if (!silent)
                showResultNotice("登录状态", result, { silentSuccess: true });
        } catch (e) {
            if (!silent) showNotice("登录状态", stringifyError(e), "failed");
        }
    };

    const refreshRelayFiles = async (silent = false) => {
        // Relay files are embedded in settings
        const result: RelayFilesResult = {
            status: "not_implemented",
            message: "Web版使用 Settings API 替代",
            configPath: "",
            authPath: "",
            configContents: "",
            authContents: "",
        };
        setRelayFiles(result);
        return result;
    };

    const refreshEnvConflicts = async (silent = false) => {
        const result: EnvConflictsResult = {
            status: "not_implemented",
            message: "环境变量检测功能在Web版中暂不可用",
            conflicts: [],
        };
        setEnvConflicts(result);
        return result;
    };

    const removeEnvConflicts = async (names: string[]) => {
        showNotice("环境变量清理", "Web版暂不支持此功能", "not_implemented");
    };

    const refreshCcsProviders = async (silent = false) => {
        const result: CcsProvidersResult = {
            status: "not_implemented",
            message: "cc-switch 导入暂不可用",
            dbPath: "",
            providers: [],
        };
        setCcsProviders(result);
        return result;
    };

    const importCcsProviders = async () => {
        showNotice("cc-switch 导入", "Web版暂不支持此功能", "not_implemented");
    };

    const refreshLocalSessions = async (silent = false) => {
        const result = await run(() => api.listSessions());
        if (result) {
            const mapped: LocalSessionsResult = {
                status: "ok",
                message: "OK",
                dbPath: result.dbPaths?.[0] || "",
                dbPaths: result.dbPaths || [],
                sessions: result.sessions || [],
            };
            setLocalSessions(mapped);
            if (!silent || !isSuccessStatus("ok"))
                showResultNotice("会话管理", mapped, { silentSuccess: true });
        }
        return null;
    };

    const refreshZedRemoteProjects = async (silent = false) => {
        const result: ZedRemoteProjectsResult = {
            status: "not_implemented",
            message: "Zed 远程项目在 Web 版中暂不可用",
            projects: [],
        };
        setZedRemoteProjects(result);
        return result;
    };

    const openZedRemoteProject = async (
        project: ZedRemoteProject,
        strategy: string = settingsForm.zedRemoteOpenStrategy ||
            "addToFocusedWorkspace",
    ) => {
        showNotice("Zed 远程打开", "Web版暂不支持此功能", "not_implemented");
    };

    const forgetZedRemoteProject = async (project: ZedRemoteProject) => {
        showNotice("Zed 远程项目", "Web版暂不支持此功能", "not_implemented");
    };

    const deleteLocalSession = async (session: LocalSession) => {
        const title = session.title || session.id;
        if (
            !window.confirm(
                `删除会话"${title}"？此操作会删除本地数据库记录和 rollout 文件，并创建备份。`,
            )
        )
            return;
        const result = await run(() => api.deleteSession(session.id));
        if (result) {
            showNotice("会话删除", result.message || "已删除");
            await refreshLocalSessions(true);
        }
    };

    const refreshLiveContextEntries = async (silent = false) => {
        const result: LiveContextEntriesResult = {
            status: "not_implemented",
            message: "工具与插件在 Web 版中暂不可用",
            entries: { mcpServers: [], skills: [], plugins: [] },
        };
        setLiveContextEntries(result.entries);
        return result;
    };

    const syncLiveContextEntries = async (
        next: BackendSettings,
        silent = false,
    ) => {
        return null;
    };

    const refreshLogs = async (silent = false) => {
        const result = await run(() => api.getLogs());
        if (result) {
            const logsResult: LogsResult = {
                status: "ok",
                message: "Logs loaded",
                path: result.path,
                text: result.text,
                lines: result.lines,
            };
            setLogs(logsResult);
            if (!silent)
                showResultNotice("日志已刷新", logsResult, {
                    silentSuccess: true,
                });
        }
    };

    const refreshDiagnostics = async (silent = false) => {
        const result: DiagnosticsResult = {
            status: "not_implemented",
            message: "诊断功能暂不可用",
            report: "",
        };
        setDiagnostics(result);
        if (!silent)
            showResultNotice("诊断已生成", result, { silentSuccess: true });
    };

    const refreshWatcher = async (silent = false) => {
        const result: WatcherResult = {
            status: "not_implemented",
            message: "Watcher 仅桌面版支持",
            enabled: false,
        };
        setWatcher(result);
        if (!silent)
            showResultNotice("Watcher 状态", result, { silentSuccess: true });
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
        if (next === "recommendations") {
        }
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
            const cmdResult: SettingsResult = {
                ...result,
                status: "ok",
                message: "Settings saved",
            };
            setSettings(cmdResult);
            setSettingsForm(normalizeSettings(result.settings));
            showNotice(
                "设置保存",
                result.status === "ok" ? "设置已保存" : "保存失败",
                result.status,
            );
        }
    };

    const saveSettingsValue = async (next: BackendSettings, silent = true) => {
        const normalized = normalizeSettings(next);
        setSettingsForm(normalized);
        const result = await run(() => api.saveSettings(normalized));
        if (result) {
            const cmdResult: SettingsResult = {
                ...result,
                status: "ok",
                message: "Settings saved",
            };
            setSettings(cmdResult);
            setSettingsForm(normalizeSettings(result.settings));
            if (!silent || result.status !== "ok")
                showNotice(
                    "设置保存",
                    result.status === "ok" ? "设置已保存" : "保存失败",
                    result.status,
                );
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
            showNotice(
                "重启 Codex++",
                result.message || "已重启",
                result.status,
            );
        }
    };

    const checkUpdate = async (silent = false) => {
        const result: UpdateResult = {
            status: "not_implemented",
            message: "Web版自动更新暂不可用",
            updateAvailable: false,
        };
        setUpdate(result);
        if (!silent)
            showNotice("GitHub Release 检查", result.message, result.status);
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
        const result: AdsResult = {
            status: "not_implemented",
            message: "推荐内容加载暂不可用",
            version: 0,
            ads: [],
        };
        setAds(result);
        if (!silent)
            showResultNotice("推荐内容", result, { silentSuccess: true });
    };

    const refreshScriptMarket = async (silent = false) => {
        const result: ScriptMarketResult = {
            status: "not_implemented",
            message: "Web版暂不支持脚本市场",
            market: {
                status: "n/a",
                message: "N/A",
                indexUrl: "",
                updatedAt: "",
                scripts: [],
            },
            user_scripts: { enabled: true, scripts: [] },
        };
        setScriptMarket(result);
        if (!silent)
            showResultNotice("脚本市场", result, { silentSuccess: true });
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
                showNotice(
                    "供应商切换",
                    r.status === "ok" ? "切换成功" : "切换失败",
                    r.status,
                );
                await refreshSettings(true);
            }
        } finally {
            setRelaySwitching(false);
        }
    };

    const applyRelayInjection = async (profileId?: string) => {
        const r = await run(() =>
            api.applyRelayInjection(profileId ? { profileId } : undefined),
        );
        if (r)
            showNotice(
                "中转注入",
                r.status === "ok" ? "注入成功" : "注入失败",
                r.status,
            );
    };

    const clearRelayInjection = async () => {
        const r = await run(() => api.clearRelayInjection());
        if (r)
            showNotice(
                "清除注入",
                r.status === "ok" ? "已清除" : "清除失败",
                r.status,
            );
    };

    const testRelayProfileAction = async (profile: RelayProfile) => {
        const r = await run(() =>
            api.testRelayProfile({
                baseUrl: profile.baseUrl,
                apiKey: profile.apiKey,
                testModel: profile.testModel,
            }),
        );
        if (r)
            showNotice(
                "连接测试",
                r.status === "ok" ? `HTTP ${r.httpStatus}` : r.message,
                r.status,
            );
    };

    // ── Relay profile helpers ──

    const activeRelayProfile = (): RelayProfile => {
        return (
            settingsForm.relayProfiles.find(
                (p) => p.id === settingsForm.activeRelayId,
            ) ||
            settingsForm.relayProfiles[0] ||
            defaultSettings.relayProfiles[0]
        );
    };

    const relayModeLabel = (mode: RelayMode): string => {
        if (mode === "aggregate") return "聚合供应商";
        if (mode === "pureApi") return "纯 API";
        return "官方登录";
    };

    const relayProtocolLabel = (protocol: RelayProtocol): string => {
        return protocol === "chatCompletions"
            ? "Chat Completions 转 Responses"
            : "Responses API";
    };

    const relayProfileConfigBrief = (profile: RelayProfile): string => {
        if (profile.relayMode === "aggregate") {
            const agg = profile.aggregate;
            const strategyLabel = agg?.strategy
                ? aggregateStrategyLabel(agg.strategy)
                : "失败切换";
            return `${strategyLabel} · ${agg?.members?.length ?? 0} 个成员`;
        }
        if (profile.relayMode === "official")
            return profile.officialMixApiKey ? "混入 API Key" : "不写 API 文件";
        return profile.baseUrl || "未填写 URL";
    };

    const aggregateStrategyLabel = (
        strategy: RelayAggregateStrategy,
    ): string => {
        const labels: Record<RelayAggregateStrategy, string> = {
            failover: "失败切换",
            conversationRoundRobin: "按对话轮转",
            requestRoundRobin: "按请求轮转",
            weightedRoundRobin: "权重轮转",
        };
        return labels[strategy] || "失败切换";
    };

    const providerInitial = (name: string): string => {
        return name.charAt(0).toUpperCase();
    };

    const createRelayProfileId = (): string => {
        return `relay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    };

    const makeNewRelayProfile = (): RelayProfile => {
        const id = createRelayProfileId();
        const isFirst = settingsForm.relayProfiles.length === 0;
        // 默认第一个供应商设为 DeepSeek
        if (isFirst) {
            return {
                id,
                name: "DeepSeek",
                model: "deepseek-v4-flash",
                baseUrl: "https://api.deepseek.com",
                upstreamBaseUrl: "https://api.deepseek.com",
                apiKey: "",
                protocol: "chatCompletions",
                relayMode: "pureApi",
                officialMixApiKey: false,
                testModel: "deepseek-v4-flash",
                configContents: "",
                authContents: "",
                useCommonConfig: true,
                contextSelection: emptyContextSelection(),
                contextSelectionInitialized: true,
                contextWindow: "",
                autoCompactLimit: "",
                modelList: "deepseek-v4-flash\ndeepseek-v4-pro",
                userAgent: "",
            };
        }
        return {
            id,
            name: `供应商 ${settingsForm.relayProfiles.length + 1}`,
            model: "",
            baseUrl: "",
            upstreamBaseUrl: "",
            apiKey: "",
            protocol: "responses",
            relayMode: "pureApi",
            officialMixApiKey: false,
            testModel: "",
            configContents: "",
            authContents: "",
            useCommonConfig: true,
            contextSelection: emptyContextSelection(),
            contextSelectionInitialized: true,
            contextWindow: "",
            autoCompactLimit: "",
            modelList: "",
            userAgent: "",
        };
    };

    const applyRelayProfilePatch = (
        profile: RelayProfile,
        patch: Partial<RelayProfile>,
    ): RelayProfile => {
        let next = { ...profile, ...patch };
        if (patch.baseUrl !== undefined) {
            next.upstreamBaseUrl = patch.baseUrl;
        }
        if (patch.upstreamBaseUrl !== undefined) {
            next.baseUrl = patch.upstreamBaseUrl;
        }
        return next;
    };

    const saveRelayProfiles = async (next: BackendSettings) => {
        await saveSettingsValue(next, true);
    };

    const addRelayProfileToSettings = (
        settings: BackendSettings,
        profile: RelayProfile,
    ): BackendSettings => {
        return {
            ...settings,
            relayProfiles: [...settings.relayProfiles, profile],
        };
    };

    const updateRelayProfileInSettings = (
        settings: BackendSettings,
        id: string,
        patch: Partial<RelayProfile>,
    ): BackendSettings => {
        return {
            ...settings,
            relayProfiles: settings.relayProfiles.map((p) =>
                p.id === id ? applyRelayProfilePatch(p, patch) : p,
            ),
        };
    };

    const removeRelayProfileFromSettings = (
        settings: BackendSettings,
        id: string,
    ): BackendSettings => {
        const profiles = settings.relayProfiles.filter((p) => p.id !== id);
        return {
            ...settings,
            relayProfiles: profiles.length
                ? profiles
                : defaultSettings.relayProfiles,
            activeRelayId:
                settings.activeRelayId === id
                    ? profiles[0]?.id || "default"
                    : settings.activeRelayId,
        };
    };

    const duplicateRelayProfileInSettings = (
        settings: BackendSettings,
        id: string,
    ): BackendSettings => {
        const sourceIndex = settings.relayProfiles.findIndex(
            (p) => p.id === id,
        );
        const source = settings.relayProfiles[sourceIndex];
        if (!source) return settings;
        const newId = createRelayProfileId();
        const copy = {
            ...source,
            id: newId,
            name: `${source.name || "供应商"} 副本`,
        };
        const profiles = [...settings.relayProfiles];
        profiles.splice(
            sourceIndex >= 0 ? sourceIndex + 1 : profiles.length,
            0,
            copy,
        );
        return { ...settings, relayProfiles: profiles };
    };

    const reorderRelayProfiles = (
        settings: BackendSettings,
        sourceId: string,
        targetId: string,
    ): BackendSettings => {
        if (sourceId === targetId) return settings;
        const sourceIndex = settings.relayProfiles.findIndex(
            (p) => p.id === sourceId,
        );
        const targetIndex = settings.relayProfiles.findIndex(
            (p) => p.id === targetId,
        );
        if (sourceIndex < 0 || targetIndex < 0) return settings;
        const profiles = [...settings.relayProfiles];
        const [moved] = profiles.splice(sourceIndex, 1);
        profiles.splice(targetIndex, 0, moved);
        return { ...settings, relayProfiles: profiles };
    };

    // ── Initial load ──
    useEffect(() => {
        navigate(route);
    }, []); // Run once on mount

    // ── Render sidebar ──
    const sidebar = (
        <div className="sidebar">
            <div className="brand">
                <div className="brand-mark">
                    {theme === "dark" ? "🧊" : "⚡"}
                </div>
                <div className="brand-copy">
                    <div className="brand-title-row">
                        <span className="brand-title">Codex++</span>
                        <span className="update-dot" title="Web 版">
                            🌐
                        </span>
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
                        {r.badge && (
                            <span className="nav-badge">{r.badge}</span>
                        )}
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
                    <CardDescription>
                        基于 Web 的 Codex 管理工具
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid two">
                        <div className="panel">
                            <div className="panel-head">
                                <Power size={16} />
                                <span>启动状态</span>
                            </div>
                            <div className="status-line">
                                <span
                                    className={
                                        overview?.latest_launch?.status ===
                                        "running"
                                            ? "good"
                                            : "warn"
                                    }
                                >
                                    {overview?.latest_launch?.status ||
                                        "未检测"}
                                </span>
                            </div>
                            {overview?.latest_launch?.started_at_ms && (
                                <div className="metric-list">
                                    <div>
                                        启动时间:{" "}
                                        {new Date(
                                            overview.latest_launch
                                                .started_at_ms,
                                        ).toLocaleString("zh-CN")}
                                    </div>
                                </div>
                            )}
                            <div className="toolbar">
                                <Button size="sm" onClick={launch}>
                                    <Rocket size={14} /> 启动
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={restart}
                                >
                                    <RefreshCw size={14} /> 重启
                                </Button>
                            </div>
                        </div>
                        <div className="panel">
                            <div className="panel-head">
                                <Settings size={16} />
                                <span>快速操作</span>
                            </div>
                            <div className="toolbar">
                                <Button
                                    size="sm"
                                    onClick={() => navigate("relay")}
                                >
                                    <KeyRound size={14} /> 供应商配置
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => navigate("sessions")}
                                >
                                    <MessageCircle size={14} /> 会话管理
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => navigate("enhance")}
                                >
                                    <Hammer size={14} /> 页面增强
                                </Button>
                            </div>
                            <div
                                className="hint-line"
                                style={{ marginTop: 12 }}
                            >
                                <Info size={14} />
                                <span>
                                    Web
                                    版的部分功能受限于浏览器环境，部分桌面专属功能暂不可用。
                                </span>
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
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            <Input
                                value={settingsForm.codexAppPath}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        codexAppPath: e.target.value,
                                    })
                                }
                                placeholder="例如: /Applications/Codex.app"
                                style={{ flex: 1 }}
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                    const result =
                                        await api.apiGet("/codex/detect");
                                    if (
                                        result.found &&
                                        result.found.length > 0
                                    ) {
                                        if (result.found.length === 1) {
                                            setSettingsForm({
                                                ...settingsForm,
                                                codexAppPath: result.found[0],
                                            });
                                            showNotice(
                                                "Codex 检测",
                                                `已自动设置: ${result.found[0]}`,
                                            );
                                        } else {
                                            const path = window.prompt(
                                                "检测到多个 Codex 安装路径，请选择一个:\n" +
                                                    result.found.join("\n"),
                                                result.found[0],
                                            );
                                            if (path)
                                                setSettingsForm({
                                                    ...settingsForm,
                                                    codexAppPath: path,
                                                });
                                        }
                                    } else {
                                        showNotice(
                                            "Codex 检测",
                                            result.hint ||
                                                "未检测到 Codex 安装",
                                        );
                                    }
                                }}
                            >
                                <RefreshCw size={14} /> 自动检测
                            </Button>
                        </div>
                    </div>
                    <div className="field">
                        <span>启动参数</span>
                        <Input
                            value={settingsForm.codexExtraArgs.join(" ")}
                            onChange={(e) =>
                                setSettingsForm({
                                    ...settingsForm,
                                    codexExtraArgs: e.target.value
                                        .split(" ")
                                        .filter(Boolean),
                                })
                            }
                            placeholder="额外命令行参数"
                        />
                    </div>
                    <div className="settings-block">
                        <div className="switch-row">
                            <strong>供应商配置功能</strong>
                            <small>启用后可管理多个 LLM 供应商配置</small>
                            <input
                                type="checkbox"
                                checked={settingsForm.relayProfilesEnabled}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        relayProfilesEnabled: e.target.checked,
                                    })
                                }
                            />
                        </div>
                        <div className="switch-row">
                            <strong>页面增强功能</strong>
                            <small>启用后注入增强脚本</small>
                            <input
                                type="checkbox"
                                checked={settingsForm.enhancementsEnabled}
                                onChange={(e) =>
                                    setSettingsForm({
                                        ...settingsForm,
                                        enhancementsEnabled: e.target.checked,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="toolbar">
                        <Button onClick={saveSettingsFn}>
                            <Save size={14} /> 保存设置
                        </Button>
                        <Button variant="secondary" onClick={resetSettings}>
                            <RefreshCw size={14} /> 重置
                        </Button>
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
                            {
                                key: "codexAppPluginEntryUnlock",
                                label: "插件入口解锁",
                                desc: "解锁 API Key 模式下的插件入口",
                            },
                            {
                                key: "codexAppPluginMarketplaceUnlock",
                                label: "插件市场解锁",
                                desc: "解锁插件市场功能",
                            },
                            {
                                key: "codexAppForcePluginInstall",
                                label: "强制安装插件",
                                desc: "允许安装不兼容的插件",
                            },
                            {
                                key: "codexAppModelWhitelistUnlock",
                                label: "模型白名单解锁",
                                desc: "解除模型选择限制",
                            },
                            {
                                key: "codexAppSessionDelete",
                                label: "会话删除",
                                desc: "在会话列表添加删除按钮",
                            },
                            {
                                key: "codexAppMarkdownExport",
                                label: "Markdown 导出",
                                desc: "导出会话为 Markdown",
                            },
                            {
                                key: "codexAppPasteFix",
                                label: "粘贴修复",
                                desc: "从富文本粘贴时只保留纯文本",
                            },
                            {
                                key: "codexAppProjectMove",
                                label: "项目移动",
                                desc: "允许移动项目到不同工作区",
                            },
                            {
                                key: "codexAppConversationTimeline",
                                label: "会话时间线",
                                desc: "显示会话时间线视图",
                            },
                        ].map((feat) => (
                            <div key={feat.key} className="feature-item">
                                <div>
                                    <strong>{feat.label}</strong>
                                    <small>{feat.desc}</small>
                                </div>
                                <label className="feature-toggle">
                                    <input
                                        type="checkbox"
                                        checked={
                                            (settingsForm as any)[feat.key] ??
                                            false
                                        }
                                        onChange={(e) =>
                                            setSettingsForm({
                                                ...settingsForm,
                                                [feat.key]: e.target.checked,
                                            })
                                        }
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="toolbar" style={{ marginTop: 16 }}>
                        <Button onClick={saveSettingsFn}>
                            <Save size={14} /> 保存增强设置
                        </Button>
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
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <CardTitle>会话管理</CardTitle>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => refreshLocalSessions()}
                        >
                            <RefreshCw size={14} /> 刷新
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {localSessions?.sessions &&
                    localSessions.sessions.length > 0 ? (
                        <div className="session-list">
                            {localSessions.sessions.map((session) => (
                                <div key={session.id} className="session-row">
                                    <div className="session-main">
                                        <strong>
                                            {session.title || "未命名会话"}
                                        </strong>
                                        <span>{session.modelProvider}</span>
                                        {session.updatedAtMs && (
                                            <small>
                                                {new Date(
                                                    session.updatedAtMs,
                                                ).toLocaleString("zh-CN")}
                                            </small>
                                        )}
                                    </div>
                                    <div className="session-meta">
                                        <button
                                            className="btn btn-icon"
                                            onClick={() =>
                                                deleteLocalSession(session)
                                            }
                                            title="删除会话"
                                        >
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
                        <div>
                            <strong>版本:</strong> 1.2.18
                        </div>
                        <div>
                            <strong>模式:</strong> Web (Axum + React)
                        </div>
                        <div>
                            <strong>设置路径:</strong>{" "}
                            {settings?.settings_path || "N/A"}
                        </div>
                        <div>
                            <strong>Codex Home:</strong>{" "}
                            {overview?.latest_launch?.codex_app || "N/A"}
                        </div>
                    </div>
                    <div className="toolbar">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => refreshLogs()}
                        >
                            <RefreshCw size={14} /> 刷新日志
                        </Button>
                    </div>
                    {logs && logsScreen}
                </CardContent>
            </Card>
        </div>
    );

    // ── Relay sensors (direct hook calls - NOT inside useMemo!) ──
    const relaySensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    // Initialize relayDraftProfile when entering detail view
    useEffect(() => {
        if (relayNewProfileDraft) {
            setRelayDraftProfile(relayNewProfileDraft);
        } else if (relayDetailProfileId) {
            const profile = settingsForm.relayProfiles.find(
                (p) => p.id === relayDetailProfileId,
            );
            setRelayDraftProfile(profile || null);
        } else {
            setRelayDraftProfile(null);
        }
    }, [relayNewProfileDraft, relayDetailProfileId]);

    const handleRelayDragEnd = useMemo(
        () => (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const next = reorderRelayProfiles(
                settingsForm,
                String(active.id),
                String(over.id),
            );
            if (next !== settingsForm) {
                setSettingsForm(next);
                saveSettingsValue(next, true);
            }
        },
        [settingsForm],
    );

    // ── Relay screen ──
    const detailProfile =
        relayNewProfileDraft ||
        (relayDetailProfileId
            ? settingsForm.relayProfiles.find(
                  (p) => p.id === relayDetailProfileId,
              ) || null
            : null);
    const isNewProfile = !!relayNewProfileDraft;
    const draft = relayDraftProfile || detailProfile;

    const updateRelayDraft = (patch: Partial<RelayProfile>) => {
        if (draft) {
            setRelayDraftProfile(applyRelayProfilePatch(draft, patch));
        }
    };

    const saveRelayDraft = async () => {
        if (!draft) return;
        let next: BackendSettings;
        if (isNewProfile) {
            next = addRelayProfileToSettings(settingsForm, draft);
        } else {
            next = updateRelayProfileInSettings(
                settingsForm,
                detailProfile!.id,
                draft,
            );
        }
        setSettingsForm(next);
        await saveSettingsValue(next, true);
        setRelayNewProfileDraft(null);
        setRelayDetailProfileId(null);
        showNotice("供应商", isNewProfile ? "已创建" : "已保存", "ok");
    };

    const switchRelayDraft = () => {
        if (isNewProfile || !settingsForm.relayProfilesEnabled || !draft)
            return;
        const next = {
            ...settingsForm,
            relayProfiles: settingsForm.relayProfiles.map((item) =>
                item.id === detailProfile!.id ? draft : item,
            ),
            activeRelayId: detailProfile!.id,
        };
        setSettingsForm(next);
        saveSettingsValue(next, true);
        void switchRelayProfile(detailProfile!.id);
    };

    const showApiFields =
        draft?.relayMode !== "official" || draft?.officialMixApiKey;

    let relayScreen: any;
    if (detailProfile && draft) {
        const isActive =
            !isNewProfile && draft.id === settingsForm.activeRelayId;
        relayScreen = (
            <div className="relay-detail-page" key={draft.id}>
                <div className="relay-detail-sticky">
                    <div className="toolbar">
                        <Button
                            onClick={() => {
                                setRelayNewProfileDraft(null);
                                setRelayDetailProfileId(null);
                            }}
                            variant="secondary"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            返回列表
                        </Button>
                        <Button onClick={() => void saveRelayDraft()}>
                            <Save className="h-4 w-4" />
                            保存
                        </Button>
                    </div>
                </div>
                <div className="relay-profile-editor">
                    <div className="relay-editor-head">
                        <div>
                            <strong>{draft.name || "未命名供应商"}</strong>
                            <span>
                                {isNewProfile
                                    ? "新供应商"
                                    : isActive
                                      ? "当前使用中"
                                      : "非活跃"}
                            </span>
                        </div>
                        {isNewProfile ? null : (
                            <Button
                                disabled={!settingsForm.relayProfilesEnabled}
                                onClick={switchRelayDraft}
                                variant={isActive ? "secondary" : "default"}
                            >
                                {isActive ? "使用中" : "设为当前"}
                            </Button>
                        )}
                    </div>
                    {isNewProfile ? (
                        <ProviderPresetSelector
                            onSelect={(patch: PresetPatch) => {
                                updateRelayDraft(
                                    patch as unknown as Partial<RelayProfile>,
                                );
                            }}
                        />
                    ) : null}
                    <div className="relay-fields">
                        <Label className="field relay-field-name">
                            <span>名称</span>
                            <Input
                                value={draft.name}
                                onChange={(e) =>
                                    updateRelayDraft({ name: e.target.value })
                                }
                            />
                        </Label>
                        <Label className="field relay-field-mode">
                            <span>接入模式</span>
                            <select
                                className="field-select"
                                value={draft.relayMode}
                                onChange={(e) => {
                                    const relayMode = e.target
                                        .value as RelayMode;
                                    updateRelayDraft(
                                        relayMode === "official"
                                            ? {
                                                  relayMode,
                                                  officialMixApiKey: false,
                                              }
                                            : { relayMode },
                                    );
                                }}
                            >
                                <option value="official">官方登录</option>
                                <option value="pureApi">纯 API</option>
                            </select>
                        </Label>
                        <Label className="field relay-field-config-model">
                            <span>配置模型</span>
                            <Input
                                value={draft.model}
                                onChange={(e) =>
                                    updateRelayDraft({ model: e.target.value })
                                }
                                placeholder="写入 config.toml 的 model 字段，例如 gpt-5"
                            />
                        </Label>
                        <div className="relay-advanced-toggle">
                            <Button
                                aria-expanded={relayShowAdvanced}
                                onClick={() => setRelayShowAdvanced((c) => !c)}
                                size="sm"
                                type="button"
                                variant="secondary"
                            >
                                <Settings className="h-4 w-4" />
                                更多选项
                            </Button>
                        </div>
                        {relayShowAdvanced ? (
                            <div className="relay-advanced-fields">
                                <Label className="field relay-field-test-model">
                                    <span>测试模型</span>
                                    <Input
                                        value={draft.testModel}
                                        onChange={(e) =>
                                            updateRelayDraft({
                                                testModel: e.target.value,
                                            })
                                        }
                                        placeholder={`留空使用默认：${settingsForm.relayTestModel || defaultSettings.relayTestModel}`}
                                    />
                                </Label>
                                <Label className="field relay-field-context-window">
                                    <span>上下文大小</span>
                                    <Input
                                        inputMode="numeric"
                                        value={draft.contextWindow}
                                        onChange={(e) =>
                                            updateRelayDraft({
                                                contextWindow:
                                                    e.target.value.replace(
                                                        /[^\d]/g,
                                                        "",
                                                    ),
                                            })
                                        }
                                        placeholder="留空不改写，例如 200000"
                                    />
                                </Label>
                                <Label className="field relay-field-auto-compact">
                                    <span>压缩上下文大小</span>
                                    <Input
                                        inputMode="numeric"
                                        value={draft.autoCompactLimit}
                                        onChange={(e) =>
                                            updateRelayDraft({
                                                autoCompactLimit:
                                                    e.target.value.replace(
                                                        /[^\d]/g,
                                                        "",
                                                    ),
                                            })
                                        }
                                        placeholder="留空不改写，例如 160000"
                                    />
                                </Label>
                            </div>
                        ) : null}
                        {draft.relayMode === "official" ? (
                            <Label className="field relay-field-official-key">
                                <span>API Key</span>
                                <label className="inline-check">
                                    <input
                                        type="checkbox"
                                        checked={draft.officialMixApiKey}
                                        onChange={(e) =>
                                            updateRelayDraft({
                                                officialMixApiKey:
                                                    e.target.checked,
                                            })
                                        }
                                    />
                                    <span>混入 API KEY</span>
                                </label>
                            </Label>
                        ) : null}
                        {showApiFields ? (
                            <div className="relay-api-fields">
                                <Label className="field relay-field-base-url">
                                    <span>Base URL</span>
                                    <Input
                                        value={draft.baseUrl}
                                        onChange={(e) =>
                                            updateRelayDraft({
                                                baseUrl: e.target.value,
                                            })
                                        }
                                        placeholder="填写中转服务 Base URL"
                                    />
                                </Label>
                                <Label className="field relay-field-key">
                                    <span>Key</span>
                                    <Input
                                        type="password"
                                        value={draft.apiKey}
                                        onChange={(e) =>
                                            updateRelayDraft({
                                                apiKey: e.target.value,
                                            })
                                        }
                                        placeholder="输入中转服务的 API Key"
                                    />
                                </Label>
                                <Label className="field relay-field-protocol">
                                    <span>上游协议</span>
                                    <div className="protocol-options">
                                        <button
                                            className={`protocol-option ${draft.protocol === "responses" ? "active" : ""}`}
                                            onClick={() =>
                                                updateRelayDraft({
                                                    protocol: "responses",
                                                })
                                            }
                                            type="button"
                                        >
                                            Responses API
                                        </button>
                                        <button
                                            className={`protocol-option ${draft.protocol === "chatCompletions" ? "active" : ""}`}
                                            onClick={() =>
                                                updateRelayDraft({
                                                    protocol: "chatCompletions",
                                                })
                                            }
                                            type="button"
                                        >
                                            Chat Completions
                                        </button>
                                    </div>
                                </Label>
                                <Label className="field relay-field-model-list">
                                    <span>模型列表</span>
                                    <div className="relay-model-list-tools">
                                        <Textarea
                                            value={draft.modelList}
                                            onChange={(e) =>
                                                updateRelayDraft({
                                                    modelList: e.target.value,
                                                })
                                            }
                                            placeholder="每行一个模型，例如 qwen3-coder"
                                        />
                                    </div>
                                </Label>
                                <Label className="field relay-field-user-agent">
                                    <span>User-Agent</span>
                                    <Input
                                        value={draft.userAgent}
                                        onChange={(e) =>
                                            updateRelayDraft({
                                                userAgent: e.target.value,
                                            })
                                        }
                                        placeholder="留空使用默认值"
                                    />
                                </Label>
                            </div>
                        ) : null}
                    </div>
                    {showApiFields && draft.protocol === "chatCompletions" ? (
                        <div className="hint-line relay-protocol-hint">
                            <MessageCircle className="h-4 w-4" />
                            <span>
                                此上游会通过本地 127.0.0.1:57321 转成 Responses
                                API，需要从 Codex++ 启动 Codex。
                            </span>
                        </div>
                    ) : null}
                    <div className="hint-line relay-protocol-hint">
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                            {draft.relayMode === "official"
                                ? draft.officialMixApiKey
                                    ? "此供应商会保留官方登录模式，并把请求混入当前 API Key；页面增强仍使用兼容模式。"
                                    : "此供应商会切回官方登录模式，使用 ChatGPT 官方账号，不写入 API Key。"
                                : "此供应商会同时写入 config.toml 和 auth.json；API Key 也会注入到 provider bearer token。"}
                        </span>
                    </div>
                </div>
                <div className="relay-file-grid">
                    <div className="relay-file-panel">
                        <div className="relay-file-head">
                            <div>
                                <strong>config.toml 预览</strong>
                                <span>
                                    {isActive
                                        ? "当前供应商切换后会写入的预览"
                                        : "切换到此供应商时会写入的预览"}
                                </span>
                            </div>
                        </div>
                        <Textarea
                            className="relay-file-textarea"
                            value={draft.configContents}
                            onChange={(e) =>
                                updateRelayDraft({
                                    configContents: e.target.value,
                                })
                            }
                            spellCheck={false}
                        />
                    </div>
                    <div className="relay-file-panel">
                        <div className="relay-file-head">
                            <div>
                                <strong>auth.json</strong>
                                <span>
                                    {isActive
                                        ? "当前使用中的 auth 存档"
                                        : "切换到此供应商时会写入 auth.json"}
                                </span>
                            </div>
                        </div>
                        <Textarea
                            className="relay-file-textarea"
                            value={draft.authContents}
                            onChange={(e) =>
                                updateRelayDraft({
                                    authContents: e.target.value,
                                })
                            }
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        );
    } else {
        relayScreen = (
            <div className="screen">
                <Card>
                    <CardHeader>
                        <CardTitle>供应商列表</CardTitle>
                        <CardDescription>{`${settingsForm.relayProfiles.length} 个供应商配置；可拖动排序，点编辑进入详情`}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <label className="switch-row relay-master-switch">
                            <input
                                type="checkbox"
                                checked={settingsForm.relayProfilesEnabled}
                                onChange={(e) => {
                                    const next = {
                                        ...settingsForm,
                                        relayProfilesEnabled: e.target.checked,
                                    };
                                    setSettingsForm(next);
                                    saveSettingsValue(next, true);
                                }}
                            />
                            <span>
                                <strong>启用供应商配置切换</strong>
                                <small>
                                    关闭后本工具不会在手动切换时写入 Codex 的
                                    config.toml / auth.json。
                                </small>
                            </span>
                        </label>
                        <div className="relay-add-row">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setRelayNewProfileDraft(
                                        makeNewRelayProfile(),
                                    );
                                    setRelayDetailProfileId(null);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                添加供应商
                            </Button>
                        </div>
                        {settingsForm.relayProfiles.length > 0 ? (
                            <DndContext
                                sensors={relaySensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleRelayDragEnd}
                            >
                                <SortableContext
                                    items={settingsForm.relayProfiles.map(
                                        (p) => p.id,
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="relay-profile-list">
                                        {settingsForm.relayProfiles.map(
                                            (profile, index) => (
                                                <SortableRelayProfileCard
                                                    key={profile.id}
                                                    profile={profile}
                                                    index={index}
                                                    form={settingsForm}
                                                    actions={{
                                                        switchRelayProfile: (
                                                            _next,
                                                            _previous,
                                                        ) =>
                                                            switchRelayProfile(
                                                                profile.id,
                                                            ),
                                                        testRelayProfile:
                                                            testRelayProfileAction,
                                                        relaySwitching,
                                                    }}
                                                    onEdit={(id) => {
                                                        setRelayNewProfileDraft(
                                                            null,
                                                        );
                                                        setRelayDetailProfileId(
                                                            settingsForm.relayProfiles.some(
                                                                (item) =>
                                                                    item.id ===
                                                                    id,
                                                            )
                                                                ? id
                                                                : null,
                                                        );
                                                    }}
                                                    onFormChange={(next) => {
                                                        setSettingsForm(next);
                                                        saveSettingsValue(
                                                            next,
                                                            true,
                                                        );
                                                    }}
                                                    disabled={
                                                        !settingsForm.relayProfilesEnabled ||
                                                        relaySwitching
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        ) : (
                            <div className="empty">
                                <span>暂无供应商配置</span>
                                <small>点击上方按钮添加第一个供应商</small>
                            </div>
                        )}
                        <div
                            className="toolbar"
                            style={{
                                marginTop: 16,
                                justifyContent: "flex-start",
                                gap: 8,
                            }}
                        >
                            <Button
                                variant="outline"
                                disabled={
                                    !settingsForm.relayProfilesEnabled ||
                                    relaySwitching ||
                                    !settingsForm.relayProfiles.length
                                }
                                onClick={() => {
                                    const active = activeRelayProfile();
                                    applyRelayInjection(active.id);
                                }}
                            >
                                <ShieldCheck className="h-4 w-4" />
                                应用注入
                            </Button>
                            <Button
                                variant="outline"
                                disabled={relaySwitching}
                                onClick={() => clearRelayInjection()}
                            >
                                <PowerOff className="h-4 w-4" />
                                清除注入
                            </Button>
                            <Button
                                variant="outline"
                                disabled={!settingsForm.relayProfiles.length}
                                onClick={() => {
                                    const active = activeRelayProfile();
                                    if (active)
                                        void testRelayProfileAction(active);
                                }}
                            >
                                <TestTube className="h-4 w-4" />
                                测试当前连接
                            </Button>
                        </div>
                        <div
                            className="relay-grid compact"
                            style={{ marginTop: 16 }}
                        >
                            <MetricItem
                                label="当前活跃"
                                value={activeRelayProfile().name || "未设置"}
                            />
                            <MetricItem
                                label="模式"
                                value={relayModeLabel(
                                    activeRelayProfile().relayMode,
                                )}
                            />
                            <MetricItem
                                label="协议"
                                value={relayProtocolLabel(
                                    activeRelayProfile().protocol,
                                )}
                            />
                            <MetricItem
                                label="Base URL"
                                value={activeRelayProfile().baseUrl || "-"}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    function SortableRelayProfileCard({
        profile,
        index: _index,
        form,
        onFormChange,
        onEdit,
        disabled = false,
        actions,
    }: {
        profile: RelayProfile;
        index: number;
        form: BackendSettings;
        onFormChange: (value: BackendSettings) => void;
        onEdit: (id: string) => void;
        disabled?: boolean;
        actions: {
            switchRelayProfile: (
                next: BackendSettings,
                previous?: string,
            ) => void;
            testRelayProfile: (profile: RelayProfile) => void;
            relaySwitching: boolean;
        };
    }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({
            id: profile.id,
        });
        const active = profile.id === form.activeRelayId;
        const style: CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition,
        };
        return (
            <div
                className={`relay-profile-card ${active ? "active" : ""} ${isDragging ? "dragging" : ""}`}
                data-relay-profile-id={profile.id}
                key={profile.id}
                onKeyDown={(event) => {
                    if (event.key === "Enter") onEdit(profile.id);
                }}
                ref={setNodeRef}
                style={style}
                tabIndex={0}
            >
                <button
                    aria-label="拖动排序"
                    className="relay-drag"
                    title="拖动排序"
                    type="button"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <span
                    className="relay-index"
                    title={profile.name || "未命名供应商"}
                >
                    {providerInitial(profile.name)}
                </span>
                <span className="relay-summary">
                    <strong>{profile.name || "未命名供应商"}</strong>
                    <small>
                        {relayModeLabel(profile.relayMode)} ·{" "}
                        {relayProtocolLabel(profile.protocol)} ·{" "}
                        {relayProfileConfigBrief(profile)}
                    </small>
                </span>
                <span
                    className="relay-card-actions"
                    style={{ opacity: 1, pointerEvents: "auto" }}
                >
                    <Button
                        className={`relay-use-button ${active ? "active" : ""}`}
                        disabled={disabled}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (disabled) return;
                            const next = { ...form, activeRelayId: profile.id };
                            void switchRelayProfile(profile.id);
                        }}
                        size="sm"
                        title={
                            disabled
                                ? "供应商切换不可用"
                                : active
                                  ? "当前正在使用"
                                  : "设为当前"
                        }
                        variant={active ? "secondary" : "outline"}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {active ? "使用中" : "使用"}
                    </Button>
                    <span className="relay-card-extra">
                        <Button
                            onClick={(event) => {
                                event.stopPropagation();
                                void testRelayProfileAction(profile);
                            }}
                            size="icon"
                            title="发送 hi 测试"
                            variant="ghost"
                        >
                            <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit(profile.id);
                            }}
                            size="icon"
                            title="编辑"
                            variant="ghost"
                        >
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={(event) => {
                                event.stopPropagation();
                                const next = duplicateRelayProfileInSettings(
                                    form,
                                    profile.id,
                                );
                                onFormChange(next);
                            }}
                            size="icon"
                            title="复制"
                            variant="ghost"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                            disabled={form.relayProfiles.length <= 1}
                            onClick={(event) => {
                                event.stopPropagation();
                                const next = removeRelayProfileFromSettings(
                                    form,
                                    profile.id,
                                );
                                onFormChange(next);
                            }}
                            size="icon"
                            title="删除供应商"
                            variant="ghost"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </span>
                </span>
            </div>
        );
    }

    function MetricItem({ label, value }: { label: string; value: string }) {
        return (
            <div>
                <span>{label}</span>
                <strong>{value}</strong>
            </div>
        );
    }

    // ── Content router ──
    const content = () => {
        switch (route) {
            case "overview":
                return overviewScreen;
            case "relay":
                return relayScreen;
            case "settings":
                return settingsScreen;
            case "enhance":
                return enhanceScreen;
            case "sessions":
                return sessionsScreen;
            case "about":
                return aboutScreen;
            default:
                return (
                    <div className="screen">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {routes.find((r) => r.id === route)
                                        ?.label || route}
                                </CardTitle>
                                <CardDescription>
                                    此页面在 Web 版中开发中
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="empty">
                                    <span>功能开发中</span>
                                    <small>
                                        该功能为桌面专属，Web 版适配进行中
                                    </small>
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
                <div
                    key={t.id}
                    className={`toast-card${t.status === "failed" ? " failed" : ""}`}
                >
                    <div className="toast-progress" />
                    <div className="toast-icon">
                        {t.status === "failed" ? (
                            <ShieldAlert size={20} />
                        ) : (
                            <CheckCircle2 size={20} />
                        )}
                    </div>
                    <div className="toast-body">
                        <h2>{t.title}</h2>
                        <p>{t.message}</p>
                    </div>
                    <button
                        className="toast-close"
                        onClick={() =>
                            setToasts((current) =>
                                current.filter((x) => x.id !== t.id),
                            )
                        }
                        type="button"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );

    return (
        <div className={`shell ${theme}`}>
            {sidebar}
            <div className="workspace">
                <div className="topbar">
                    <h1>
                        {routes.find((r) => r.id === route)?.label || "Codex++"}
                    </h1>
                    <div className="topbar-actions">{themeToggle}</div>
                </div>
                {content()}
            </div>
            {toastContainer}
        </div>
    );
}
