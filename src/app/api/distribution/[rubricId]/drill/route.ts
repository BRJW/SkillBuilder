import { NextRequest, NextResponse } from "next/server";
import {
  getDistributionDrillSkill,
  getDistributionDrillGroup,
  getDistributionDrillPeriod,
} from "@/lib/queries/steps";
import type { DashboardFilters } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rubricId: string }> }
) {
  const { rubricId } = await params;
  const sp = request.nextUrl.searchParams;

  const scope = sp.get("scope");
  const key = sp.get("key");

  if (!scope || !key) {
    return NextResponse.json({ error: "Missing scope or key" }, { status: 400 });
  }

  const filters: DashboardFilters = {
    groupIds: sp.get("group") ? [sp.get("group")!] : undefined,
    dateFrom: sp.get("from") ?? undefined,
    dateTo: sp.get("to") ?? undefined,
  };

  try {
    let data;
    switch (scope) {
      case "skill":
        data = await getDistributionDrillSkill(rubricId, key, filters);
        break;
      case "group":
        data = await getDistributionDrillGroup(rubricId, key, filters);
        break;
      case "period":
        data = await getDistributionDrillPeriod(rubricId, key, filters);
        break;
      default:
        return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Distribution drill error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
