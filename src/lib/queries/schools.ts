import { prisma } from "@/lib/prisma";

export async function getSchools() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, district: true },
  });
}
