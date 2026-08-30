import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";
import { expenseInputSchema } from "@/lib/validations";

export async function GET() {
  const expenses = await prisma.expense.findMany({
    orderBy: { occurredOn: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = expenseInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { description, amountDollars, category, occurredOn } = parsed.data;

  const expense = await prisma.expense.create({
    data: {
      description,
      amountCents: dollarsToCents(amountDollars),
      category,
      occurredOn,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
