import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Telegram is just another frontend client — it authenticates into the
 * SAME session-cookie identity (`chub_sid`) that github-connections.ts
 * and runtime-instances.ts are already keyed on. This table exists
 * only to make that session durable across Mini App re-opens: without
 * it, every time the user reopens the Mini App they'd get a brand-new
 * anonymous session and lose their GitHub connection / Cloud Runtime
 * instances. It does not duplicate any business logic — it's purely
 * "given this Telegram user, which session do they already have".
 */
export const telegramIdentitiesTable = pgTable("telegram_identities", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  sessionId: text("session_id").notNull(),
  firstName: text("first_name"),
  username: text("username"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TelegramIdentity = typeof telegramIdentitiesTable.$inferSelect;
