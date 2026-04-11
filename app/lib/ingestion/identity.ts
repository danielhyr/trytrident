import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactIdentifiers, ContactUpdate } from "./types";

interface ContactRow {
  id: string;
  external_id: string | null;
  email: string | null;
  phone: string | null;
  [key: string]: unknown;
}

/**
 * Three-tier deterministic identity resolution.
 * Priority: external_id > email > phone
 *
 * On match: backfills missing identifiers (e.g., found by email,
 * now has external_id from Shopify order -> writes it).
 * No match: creates a new contact.
 *
 * Returns { contact, created, updated }:
 *   created=true  → new contact inserted
 *   updated=true  → existing contact had fields changed
 *   both false    → existing contact, no changes needed
 */
export async function resolveContact(
  admin: SupabaseClient,
  tenantId: string,
  identifiers: ContactIdentifiers,
  contactUpdate: ContactUpdate
): Promise<{ contact: ContactRow; created: boolean; updated: boolean }> {
  // 1. Try external_id (strongest — Shopify customer ID)
  if (identifiers.external_id) {
    const { data } = await admin
      .from("contact")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("external_id", identifiers.external_id)
      .maybeSingle();

    if (data) {
      const updated = await backfillAndUpdate(admin, data, identifiers, contactUpdate);
      return { contact: data, created: false, updated };
    }
  }

  // 2. Try email
  if (identifiers.email) {
    const { data } = await admin
      .from("contact")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("email", identifiers.email)
      .maybeSingle();

    if (data) {
      const updated = await backfillAndUpdate(admin, data, identifiers, contactUpdate);
      return { contact: data, created: false, updated };
    }
  }

  // 3. Try phone
  if (identifiers.phone) {
    const { data } = await admin
      .from("contact")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("phone", identifiers.phone)
      .maybeSingle();

    if (data) {
      const updated = await backfillAndUpdate(admin, data, identifiers, contactUpdate);
      return { contact: data, created: false, updated };
    }
  }

  // 4. No match — create new contact
  const insertData: Record<string, unknown> = {
    tenant_id: tenantId,
    ...contactUpdate,
  };
  if (identifiers.external_id)
    insertData.external_id = identifiers.external_id;
  if (identifiers.email) insertData.email = identifiers.email;
  if (identifiers.phone) insertData.phone = identifiers.phone;

  const { data: newContact, error } = await admin
    .from("contact")
    .insert(insertData)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);

  return { contact: newContact, created: true, updated: false };
}

/**
 * Backfill missing identifiers and apply profile updates on an existing contact.
 * Returns true if any fields were actually written.
 */
async function backfillAndUpdate(
  admin: SupabaseClient,
  contact: ContactRow,
  identifiers: ContactIdentifiers,
  contactUpdate: ContactUpdate
): Promise<boolean> {
  const updates: Record<string, unknown> = {};

  // Backfill identifiers the contact didn't have yet
  if (identifiers.external_id && !contact.external_id) {
    updates.external_id = identifiers.external_id;
  }
  if (identifiers.email && !contact.email) {
    updates.email = identifiers.email;
  }
  if (identifiers.phone && !contact.phone) {
    updates.phone = identifiers.phone;
  }

  // Apply profile field updates — only if the value actually changed
  for (const [key, value] of Object.entries(contactUpdate)) {
    if (value !== undefined && contact[key] !== value) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("contact").update(updates).eq("id", contact.id);
    return true;
  }

  return false;
}
