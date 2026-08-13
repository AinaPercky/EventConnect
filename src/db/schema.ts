// src/db/schema.ts
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const participants = pgTable('participants', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  emailOrPhone: text('email_or_phone').notNull(),
  organization: text('organization'),
  status: text('status').notNull().default('registered'), // 'registered' | 'present'
  qrCodeToken: text('qr_code_token').notNull().unique(),
  scannedAt: timestamp('scanned_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
