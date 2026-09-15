import fs from "fs";
import path from "path";
import crypto from "crypto";
import { defaultVault } from "@/lib/config";

export interface HermesMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  vaultCitations?: string[];
  groundingScore?: number;
}

export interface HermesSession {
  sessionId: string;
  userIdentifier: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: HermesMessage[];
  contextSummary?: string;
  vaultPath: string;
}

const HERMES_SESSIONS_DIR = "Hermes_Sessions";

/**
 * Resolves the directory path for storing Hermes persistent sessions in nipei-vault.
 */
export function getHermesSessionsDir(): string | null {
  const vaultRoot = defaultVault();
  if (!vaultRoot) return null;
  const dir = path.join(vaultRoot, HERMES_SESSIONS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Creates or retrieves an existing Hermes session from nipei-vault.
 */
export function getOrCreateSession(
  sessionId: string,
  userIdentifier: string = "Usuario General",
  title?: string
): HermesSession | null {
  const sessionsDir = getHermesSessionsDir();
  if (!sessionsDir) return null;

  const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = path.join(sessionsDir, `session_${cleanSessionId}.json`);

  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as HermesSession;
    } catch (err) {
      console.error("Error reading session JSON:", filePath, err);
    }
  }

  // Create new session
  const createdIso = new Date().toISOString();
  const vaultRoot = defaultVault() || "";
  const relativePath = path.relative(vaultRoot, filePath).replace(/\\/g, "/");

  const newSession: HermesSession = {
    sessionId: cleanSessionId,
    userIdentifier,
    title: title || `Conversación ${cleanSessionId.slice(0, 8)}`,
    createdAt: createdIso,
    updatedAt: createdIso,
    messages: [
      {
        id: `sys-${Date.now()}`,
        role: "system",
        content: "Hermes 2.0 Orquestador Conversacional — Nipëi OS. Respuestas fundamentadas 100% en Nipëi Vault.",
        timestamp: createdIso,
      },
    ],
    contextSummary: "Sesión iniciada recientemente. Sin historial extenso.",
    vaultPath: relativePath,
  };

  fs.writeFileSync(filePath, JSON.stringify(newSession, null, 2), "utf-8");
  return newSession;
}

/**
 * Appends a message to a Hermes session and updates context summary if needed.
 */
export function appendMessageToSession(
  sessionId: string,
  msg: Omit<HermesMessage, "id" | "timestamp">
): HermesSession | null {
  const session = getOrCreateSession(sessionId);
  if (!session) return null;

  const timestamp = new Date().toISOString();
  const fullMessage: HermesMessage = {
    id: `msg-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    role: msg.role,
    content: msg.content,
    timestamp,
    vaultCitations: msg.vaultCitations || [],
    groundingScore: msg.groundingScore ?? 1.0,
  };

  session.messages.push(fullMessage);
  session.updatedAt = timestamp;

  // Compress / update context summary if messages list grows large (> 6 messages)
  if (session.messages.length > 6) {
    const userPrompts = session.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.slice(0, 60))
      .slice(-4);
    session.contextSummary = `Historial activo: ${session.messages.length} mensajes. Temas recientes: ${userPrompts.join(" | ")}`;
  }

  const sessionsDir = getHermesSessionsDir();
  if (sessionsDir) {
    const filePath = path.join(sessionsDir, `session_${session.sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  }

  return session;
}

/**
 * Lists all active Hermes sessions saved in nipei-vault.
 */
export function listActiveSessions(): HermesSession[] {
  const sessionsDir = getHermesSessionsDir();
  if (!sessionsDir) return [];

  const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
  const sessions: HermesSession[] = [];

  for (const f of files) {
    try {
      const data = fs.readFileSync(path.join(sessionsDir, f), "utf-8");
      sessions.push(JSON.parse(data));
    } catch (err) {
      console.error("Error loading session file:", f, err);
    }
  }

  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
