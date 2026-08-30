import { prisma } from "@/lib/prisma";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import type { ExpenseDTO } from "@/lib/types";

export default async function Home() {
  const expenses = await prisma.expense.findMany({
    orderBy: { occurredOn: "desc" },
  });

  const initialExpenses: ExpenseDTO[] = expenses.map((expense) => ({
    ...expense,
    occurredOn: expense.occurredOn.toISOString(),
  }));

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Expense Tracker</h1>
      <ExpenseTracker initialExpenses={initialExpenses} />
    </main>
  );
}
