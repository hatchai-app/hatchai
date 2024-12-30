"use server"

// app/(chat)/profile/actions.ts
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/queries";
import { insuranceCompany, insurancePlan, userInsurance } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getInsuranceCompanies() {
  return await db.select().from(insuranceCompany);
}

export async function getInsurancePlans(companyId: string) {
  return await db
    .select()
    .from(insurancePlan)
    .where(eq(insurancePlan.companyId, companyId));
}

export async function getCurrentUserInsurance(userId: string) {
  return await db
    .select({
      companyName: insuranceCompany.name,
      planName: insurancePlan.name,
      planType: insurancePlan.type,
      planId: insurancePlan.id,
      companyId: insuranceCompany.id,
      detailsJson: userInsurance.detailsJson,
    })
    .from(userInsurance)
    .innerJoin(insurancePlan, eq(userInsurance.planId, insurancePlan.id))
    .innerJoin(
      insuranceCompany,
      eq(insurancePlan.companyId, insuranceCompany.id)
    )
    .where(eq(userInsurance.userId, userId));
}

export async function updateInsurance(
  companyId: string,
  planId: string,
  detailsJson?: {
    medicalBills?: { date: string; amount: string; description: string }[];
    transcripts?: { date: string; notes: string }[];
  }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !planId) {
    throw new Error("Missing required fields");
  }

  // Delete existing insurance if any
  await db
    .delete(userInsurance)
    .where(eq(userInsurance.userId, userId));

  // Insert new insurance
  await db.insert(userInsurance).values({
    userId,
    planId,
    detailsJson: detailsJson || null,
  });

  revalidatePath("/profile");
}