import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const path = process.env.DB_PATH ?? new URL("../../.local/app.db", import.meta.url).pathname;
if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

export const db = new DatabaseSync(path);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_codes (email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, user_id TEXT REFERENCES users(id), nickname TEXT NOT NULL, department TEXT NOT NULL, avatar TEXT NOT NULL,
  regret TEXT NOT NULL, goal_text TEXT NOT NULL, notice TEXT NOT NULL, serious INTEGER NOT NULL, goal_sample INTEGER NOT NULL, round INTEGER NOT NULL,
  state TEXT NOT NULL, ending_title TEXT, ending_text TEXT, next_action TEXT, ending_sample INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ranking_entries (
  run_id TEXT PRIMARY KEY, user_key TEXT NOT NULL, nickname TEXT NOT NULL, department TEXT NOT NULL, score INTEGER NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS achievements (run_id TEXT NOT NULL REFERENCES ranking_entries(run_id), achievement TEXT NOT NULL, PRIMARY KEY (run_id, achievement));
CREATE TABLE IF NOT EXISTS ai_logs (id TEXT PRIMARY KEY, feature TEXT NOT NULL, prompt_version TEXT NOT NULL, input TEXT NOT NULL, raw_output TEXT, parse_ok INTEGER NOT NULL, is_fallback INTEGER NOT NULL, error TEXT, created_at INTEGER NOT NULL);
`);

export const newId = () => randomUUID();
