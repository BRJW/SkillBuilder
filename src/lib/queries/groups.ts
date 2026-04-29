import { prisma } from "@/lib/prisma";

export async function getGroups() {
  return prisma.group.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, district: true },
  });
}
