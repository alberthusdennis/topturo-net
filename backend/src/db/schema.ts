import { pgTable, serial, varchar, text, timestamp, integer, boolean, decimal, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users (Admins & Owners)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'admin' | 'owner'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// PCs
export const pcs = pgTable('pcs', {
  id: serial('id').primaryKey(),
  pcCode: varchar('pc_code', { length: 10 }).notNull().unique(), // e.g., PC01
  aliasName: varchar('alias_name', { length: 50 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('available').notNull(), // 'available' | 'active' | 'maintenance'
  locationId: integer('location_id').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Members
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active' | 'blocked'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Prices Configuration
export const prices = pgTable('prices', {
  id: serial('id').primaryKey(),
  packageName: varchar('package_name', { length: 100 }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  priceMember: decimal('price_member', { precision: 12, scale: 2 }).notNull(),
  priceNonMember: decimal('price_non_member', { precision: 12, scale: 2 }).notNull(),
  isNightPackage: boolean('is_night_package').default(false).notNull(),
});

// Saldo Ledgers
export const saldoLedgers = pgTable('saldo_ledgers', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').references(() => members.id).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(), // positive for top-up, negative for usage
  transactionRefId: integer('transaction_ref_id'), // Will link to transactions.id, null if manual adjustment
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sessions
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  pcId: integer('pc_id').references(() => pcs.id).notNull(),
  memberId: integer('member_id').references(() => members.id), // null if non-member guest
  guestName: varchar('guest_name', { length: 100 }), // only for non-members
  startTime: timestamp('start_time').defaultNow().notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  endTime: timestamp('end_time').notNull(), // calculated as startTime + durationMinutes
  status: varchar('status', { length: 20 }).default('running').notNull(), // 'running' | 'completed'
  version: integer('version').default(1).notNull(), // For optimistic locking
});

// Transactions
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  trxNumber: varchar('trx_number', { length: 50 }).notNull().unique(),
  sessionId: integer('session_id').references(() => sessions.id), // null if top-up only
  type: varchar('type', { length: 20 }).notNull(), // 'session' | 'add_time' | 'top_up'
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // 'cash' | 'qris' | 'transfer' | 'saldo' | 'mixed'
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  itemPriceSnapshot: jsonb('item_price_snapshot'), // stores { unitPrice, packageType, durationMinutes, customerType }
  operatorId: integer('operator_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Activity Logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  operatorId: integer('operator_id').references(() => users.id).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
