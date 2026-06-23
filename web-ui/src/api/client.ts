/**
 * API client for Codex++ Web.
 * Replaces Tauri's invoke() with standard fetch() calls.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

export async function apiPut<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status}`);
  return res.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
  return res.json();
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`);
  return res.json();
}

// ── Settings ──

export async function loadSettings() {
  return apiGet("/settings");
}

export async function saveSettings(payload: any) {
  return apiPut("/settings", payload);
}

// ── Status ──

export async function backendStatus() {
  return apiGet("/status");
}

// ── Relay Profiles ──

export async function listRelayProfiles() {
  return apiGet("/relay/profiles");
}

export async function getRelayProfile(id: string) {
  return apiGet(`/relay/profiles/${encodeURIComponent(id)}`);
}

export async function createRelayProfile(payload: any) {
  return apiPost("/relay/profiles", payload);
}

export async function updateRelayProfile(id: string, payload: any) {
  return apiPut(`/relay/profiles/${encodeURIComponent(id)}`, payload);
}

export async function deleteRelayProfile(id: string) {
  return apiDelete(`/relay/profiles/${encodeURIComponent(id)}`);
}

export async function applyRelayInjection(payload?: any) {
  return apiPost("/relay/apply", payload);
}

export async function clearRelayInjection() {
  return apiPost("/relay/clear");
}

export async function switchRelayProfile(profileId: string) {
  return apiPost("/relay/switch", { profileId });
}

export async function testRelayProfile(payload: any) {
  return apiPost("/relay/test", payload);
}

// ── Sessions ──

export async function listSessions() {
  return apiGet("/sessions");
}

export async function deleteSession(id: string) {
  return apiDelete(`/sessions/${encodeURIComponent(id)}`);
}

// ── Enhancements ──

export async function getEnhancements() {
  return apiGet("/enhancements");
}

export async function updateEnhancements(payload: any) {
  return apiPut("/enhancements", payload);
}

// ── Provider Presets ──

export async function listPresets() {
  return apiGet("/providers/presets");
}

// ── Logs ──

export async function getLogs() {
  return apiGet("/logs");
}

// ── Launch ──

export async function launchCodex() {
  return apiPost("/launch");
}

export async function restartCodex() {
  return apiPost("/restart");
}
