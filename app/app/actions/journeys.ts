"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthContext, isError } from "@/lib/auth/context";
import * as journeysAPI from "@/lib/api/journeys";
import type {
  Journey,
  JourneyStats,
  JourneyEnrollment,
  CreateJourneyInput,
  UpdateJourneyInput,
  ListJourneysOptions,
} from "@/lib/journeys/types";

export async function createJourney(
  input: CreateJourneyInput
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.createJourney(
      ctx.admin,
      ctx.tenantId,
      input
    );
    revalidatePath("/journeys");
    return { journey };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create journey",
    };
  }
}

export async function updateJourney(
  journeyId: string,
  input: UpdateJourneyInput
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.updateJourney(
      ctx.admin,
      ctx.tenantId,
      journeyId,
      input
    );
    revalidatePath("/journeys");
    revalidatePath(`/journeys/${journeyId}`);
    return { journey };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update journey",
    };
  }
}

export async function deleteJourney(
  journeyId: string
): Promise<{ success: true } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    await journeysAPI.deleteJourney(ctx.admin, ctx.tenantId, journeyId);
    revalidatePath("/journeys");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete journey",
    };
  }
}

export async function duplicateJourney(
  journeyId: string
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.duplicateJourney(
      ctx.admin,
      ctx.tenantId,
      journeyId
    );
    revalidatePath("/journeys");
    return { journey };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to duplicate journey",
    };
  }
}

export async function activateJourney(
  journeyId: string,
  schedule?: { scheduled_for: string; timezone: string } | null
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.activateJourney(
      ctx.admin,
      ctx.tenantId,
      journeyId,
      schedule
    );
    revalidatePath("/journeys");
    revalidatePath(`/journeys/${journeyId}`);
    return { journey };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to activate journey",
    };
  }
}

export async function pauseJourney(
  journeyId: string
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.pauseJourney(
      ctx.admin,
      ctx.tenantId,
      journeyId
    );
    revalidatePath("/journeys");
    revalidatePath(`/journeys/${journeyId}`);
    return { journey };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to pause journey",
    };
  }
}

export async function resumeJourney(
  journeyId: string
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.resumeJourney(
      ctx.admin,
      ctx.tenantId,
      journeyId
    );
    revalidatePath("/journeys");
    revalidatePath(`/journeys/${journeyId}`);
    return { journey };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to resume journey",
    };
  }
}

export async function archiveJourney(
  journeyId: string
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext("admin");
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.archiveJourney(
      ctx.admin,
      ctx.tenantId,
      journeyId
    );
    revalidatePath("/journeys");
    revalidatePath(`/journeys/${journeyId}`);
    return { journey };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to archive journey",
    };
  }
}

export async function fetchJourneys(
  options?: ListJourneysOptions
): Promise<
  { journeys: Journey[]; total: number } | { error: string }
> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    return await journeysAPI.listJourneys(ctx.admin, ctx.tenantId, options);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to fetch journeys",
    };
  }
}

export async function fetchJourney(
  journeyId: string
): Promise<{ journey: Journey } | { error: string }> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const journey = await journeysAPI.getJourney(
      ctx.admin,
      ctx.tenantId,
      journeyId
    );
    return { journey };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Journey not found",
    };
  }
}

export async function fetchJourneyStats(
  journeyId: string
): Promise<{ stats: JourneyStats } | { error: string }> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    const stats = await journeysAPI.getJourneyStats(
      ctx.admin,
      ctx.tenantId,
      journeyId
    );
    return { stats };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to fetch journey stats",
    };
  }
}

export async function fetchEnrollments(
  journeyId: string,
  options?: { limit?: number; offset?: number }
): Promise<
  { enrollments: JourneyEnrollment[]; total: number } | { error: string }
> {
  const ctx = await resolveAuthContext();
  if (isError(ctx)) return ctx;

  try {
    return await journeysAPI.getEnrollments(
      ctx.admin,
      ctx.tenantId,
      journeyId,
      options
    );
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to fetch enrollments",
    };
  }
}
