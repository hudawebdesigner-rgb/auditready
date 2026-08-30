"use client";

import { formatCents, sumCents } from "@/lib/money";
import type { ExpenseDTO } from "@/lib/types";

type Props = {
  expenses: ExpenseDTO[];
  onDeleted: (id: string) => void;
};

export function ExpenseList({ expenses, onDeleted }: Props) {
  async function handleDelete(id: string) {
    onDeleted(id);
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  }

  if (expenses.length === 0) {
    return <p className="text-gray-500">No expenses yet.</p>;
  }

  return (
    <div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2">Date</th>
            <th className="py-2">Description</th>
            <th className="py-2">Category</th>
            <th className="py-2 text-right">Amount</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b">
              <td className="py-2">
                {new Date(expense.occurredOn).toLocaleDateString()}
              </td>
              <td className="py-2">{expense.description}</td>
              <td className="py-2">{expense.category}</td>
              <td className="py-2 text-right">
                {formatCents(expense.amountCents)}
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="text-red-600 text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 font-semibold">
        Total: {formatCents(sumCents(expenses.map((e) => e.amountCents)))}
      </p>
    </div>
  );
}
