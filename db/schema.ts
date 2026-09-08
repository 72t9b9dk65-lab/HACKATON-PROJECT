import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const careWorkspace = sqliteTable('care_workspace', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull(),
  snapshot: text('snapshot').notNull(),
});
export const careFiles = sqliteTable('care_files', {
  id: text('id').primaryKey(),
  metadata: text('metadata').notNull(),
  createdAt: text('created_at').notNull(),
});
export const careUsers = sqliteTable('care_users', {
  id: text('id').primaryKey(),
  identityKey: text('identity_key').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  createdAt: text('created_at').notNull(),
  disabled: integer('disabled').notNull().default(0),
});
export const careSessions = sqliteTable('care_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => careUsers.id),
  origin: text('origin').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const careOAuthFlows = sqliteTable('care_oauth_flows', {
  stateHash: text('state_hash').primaryKey(),
  browserHash: text('browser_hash').notNull(),
  provider: text('provider').notNull(),
  origin: text('origin').notNull(),
  nonce: text('nonce').notNull(),
  verifier: text('verifier').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
