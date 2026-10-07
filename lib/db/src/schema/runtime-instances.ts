import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row per runtime instance (= one Docker container running one
 * project preview). Tracks lifecycle state, resource limits actually
 * applied, and enough metadata for the reaper to clean up safely.
 */
export const runtimeInstancesTable = pgTable("runtime_instances", {
  id: text("id").primaryKey(), // uuid, also used as the container name suffix
  sessionId: text("session_id").notNull(), // scopes ownership, same cookie as GitHub connections
  template: text("template").notNull(), // runtime profile id — see runtime-manager/src/runtime/profiles (e.g. "node", "python")
  status: text("status").notNull().default("creating"),
  // creating | created | installing | install_failed | building | build_failed | ready | starting | running | stopping | stopped | error | removed

  containerId: text("container_id"),
  containerName: text("container_name").notNull(),
  networkName: text("network_name").notNull(),
  internalIp: text("internal_ip"),
  internalPort: integer("internal_port").notNull().default(5173),
  previewSlug: text("preview_slug").notNull(), // <previewSlug>.preview.<domain>
  hostWorkspacePath: text("host_workspace_path").notNull(),

  cpuCores: integer("cpu_cores").notNull().default(1),
  memoryMb: integer("memory_mb").notNull().default(1024),
  diskMb: integer("disk_mb").notNull().default(1024),
  pidsLimit: integer("pids_limit").notNull().default(256),
  maxUptimeMs: integer("max_uptime_ms").notNull().default(3 * 60 * 60 * 1000),

  lastError: text("last_error"),
  lastStatusReason: text("last_status_reason"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  isEphemeral: boolean("is_ephemeral").notNull().default(true),
  startedAt: timestamp("started_at", { withTimezone: true }),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RuntimeInstance = typeof runtimeInstancesTable.$inferSelect;
export type InsertRuntimeInstance = typeof runtimeInstancesTable.$inferInsert;

export type RuntimeStatus =
  | "creating"
  | "created"
  | "installing"
  | "install_failed"
  | "building"
  | "build_failed"
  | "ready"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "error"
  | "removed";
