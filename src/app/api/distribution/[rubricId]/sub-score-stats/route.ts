import { NextRequest, NextResponse } from "next/server";
import { getSubScoreStatsForSkill } from "@/lib/queries/steps";
import { resolveRubricGoals } from "@/lib/queries/rubrics";
import type { DashboardFilters } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rubricId: string }> }
) {
  const { rubricId } = await params;
  const sp = request.nextUrl.searchParams;

  const skill = sp.get("skill");
  if (!skill) {
    return NextResponse.json({ error: "Missing skill parameter" }, { status: 400 });
  }

  const filters: DashboardFilters = {
    groupIds: sp.get("group") ? [sp.get("group")!] : undefined,
    dateFrom: sp.get("from") ?? undefined,
    dateTo: sp.get("to") ?? undefined,
  };

  try {
    const goals = await resolveRubricGoals(rubricId);
    const data = await getSubScoreStatsForSkill(rubricId, skill, filters, goals);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Sub-score stats error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
