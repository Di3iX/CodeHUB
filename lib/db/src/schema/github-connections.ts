import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row per browser session that has connected a GitHub account.
 * The access token is never stored in plaintext: it is encrypted with
 * AES-256-GCM (see api-server/src/lib/crypto.ts) using a key that only
 * the backend process holds (GITHUB_TOKEN_ENCRYPTION_KEY).
 */
export const githubConnectionsTable = pgTable("github_connections", {
  sessionId: text("session_id").primaryKey(),
  githubUserId: text("github_user_id").notNull(),
  githubLogin: text("github_login").notNull(),
  accessTokenCiphertext: text("access_token_ciphertext").notNull(),
  accessTokenIv: text("access_token_iv").notNull(),
  accessTokenTag: text("access_token_tag").notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GithubConnection = typeof githubConnectionsTable.$inferSelect;
export type InsertGithubConnection = typeof githubConnectionsTable.$inferInsert;

/**
 * Short-lived CSRF state tokens for the OAuth authorization-code flow.
 * A row is created when "/github/oauth/start" is hit and deleted the
 * moment "/github/oauth/callback" consumes it (single use, ~10 min TTL
 * enforced in code).
 */
export const githubOauthStatesTable = pgTable("github_oauth_states", {
  state: text("state").primaryKey(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GithubOauthState = typeof githubOauthStatesTable.$inferSelect;
