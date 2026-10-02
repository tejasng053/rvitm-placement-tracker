import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const revisions = sqliteTable('revisions', {
  id: integer('id').primaryKey({autoIncrement:true}),
  requestId: text('request_id').notNull(),
  payload: text('payload').notNull(),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('revisions_request_id').on(t.requestId)]);
