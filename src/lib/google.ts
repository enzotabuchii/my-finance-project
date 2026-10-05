import { createHash } from "node:crypto";
import { getSettings, setSetting } from "./settings";
import { TZ } from "./format";

/**
 * Integração mínima com Google Calendar via REST (sem SDK).
 * Escopo `calendar.app.created`: o app só enxerga/edita o calendário que ele mesmo criou
 * ("💰 Finanças"), nunca os seus outros calendários.
 */
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.app.created"];
const API = "https://www.googleapis.com/calendar/v3";

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string) {
  return `${process.env.APP_URL ?? origin}/api/google/callback`;
}

export function getAuthUrl(origin: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google OAuth: ${json.error_description ?? json.error ?? res.status}`);
  return json as { access_token: string; expires_in: number; refresh_token?: string; id_token?: string };
}

export async function exchangeCode(code: string, origin: string) {
  const tok = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (!tok.refresh_token) throw new Error("Google não retornou refresh_token. Remova o acesso do app na sua conta Google e tente de novo.");
  let email: string | null = null;
  if (tok.id_token) {
    try {
      email = JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64url").toString()).email ?? null;
    } catch {}
  }
  await setSetting("googleRefreshToken", tok.refresh_token);
  await setSetting("googleEmail", email);
  await setSetting("googleCalendarId", null);
  cached = null;
  await ensureCalendar();
}

let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const { googleRefreshToken } = await getSettings();
  if (!googleRefreshToken || !googleConfigured()) return null;
  const tok = await tokenRequest({ refresh_token: googleRefreshToken, grant_type: "refresh_token" });
  cached = { token: tok.access_token, exp: Date.now() + tok.expires_in * 1000 };
  return cached.token;
}

async function gfetch(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  if (!token) throw new Error("Google Calendar não conectado.");
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
}

export async function calendarConnected() {
  const s = await getSettings();
  return googleConfigured() && !!s.googleRefreshToken;
}

async function ensureCalendar(): Promise<string> {
  const s = await getSettings();
  if (s.googleCalendarId) return s.googleCalendarId;
  const res = await gfetch("/calendars", {
    method: "POST",
    body: JSON.stringify({ summary: "💰 Finanças", description: "Movimentações e alertas de orçamento", timeZone: TZ }),
  });
  if (!res.ok) throw new Error(`Falha ao criar calendário: ${res.status} ${await res.text()}`);
  const cal = (await res.json()) as { id: string };
  await setSetting("googleCalendarId", cal.id);
  return cal.id;
}

/** ID determinístico (hex ⊂ base32hex aceito pelo Google) => inserção idempotente. */
export function eventIdFor(seed: string) {
  return createHash("sha1").update(seed).digest("hex");
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  colorId?: string;
  /** Evento de dia inteiro (YYYY-MM-DD) ou com horário. */
  date?: string;
  start?: Date;
  end?: Date;
  /** Minutos antes para notificação popup (celular). */
  popupMinutes?: number;
}

/** Cria ou atualiza (se já existir) um evento no calendário "Finanças". */
export async function upsertEvent(seed: string, ev: CalendarEvent, retry = true): Promise<void> {
  const calendarId = await ensureCalendar();
  const id = eventIdFor(seed);
  const body: Record<string, unknown> = {
    id,
    summary: ev.summary,
    description: ev.description,
    colorId: ev.colorId,
    reminders:
      ev.popupMinutes !== undefined
        ? { useDefault: false, overrides: [{ method: "popup", minutes: ev.popupMinutes }] }
        : { useDefault: false, overrides: [] },
  };
  if (ev.date) {
    const next = new Date(`${ev.date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    body.start = { date: ev.date };
    body.end = { date: next.toISOString().slice(0, 10) };
  } else {
    body.start = { dateTime: ev.start!.toISOString(), timeZone: TZ };
    body.end = { dateTime: (ev.end ?? new Date(ev.start!.getTime() + 15 * 60_000)).toISOString(), timeZone: TZ };
  }

  const cal = encodeURIComponent(calendarId);
  let res = await gfetch(`/calendars/${cal}/events`, { method: "POST", body: JSON.stringify(body) });
  if (res.status === 409) {
    res = await gfetch(`/calendars/${cal}/events/${id}`, { method: "PUT", body: JSON.stringify(body) });
  }
  if (res.status === 404 && retry) {
    // Calendário foi apagado pelo usuário: recria e tenta de novo.
    await setSetting("googleCalendarId", null);
    return upsertEvent(seed, ev, false);
  }
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
}

export async function disconnectGoogle() {
  const s = await getSettings();
  if (s.googleRefreshToken) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(s.googleRefreshToken)}`, {
      method: "POST",
    }).catch(() => {});
  }
  await setSetting("googleRefreshToken", null);
  await setSetting("googleCalendarId", null);
  await setSetting("googleEmail", null);
  cached = null;
}
