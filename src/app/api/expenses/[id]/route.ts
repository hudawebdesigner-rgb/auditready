import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  await prisma.expense.delete({ where: { id } }).catch(() => null);

  return new NextResponse(null, { status: 204 });
}
