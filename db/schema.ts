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
