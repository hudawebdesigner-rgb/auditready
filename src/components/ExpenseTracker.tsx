"use client";

import { useState } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import type { ExpenseDTO } from "@/lib/types";

type Props = {
  initialExpenses: ExpenseDTO[];
};

export function ExpenseTracker({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses);

  return (
    <div className="flex flex-col gap-8">
      <ExpenseForm
        onCreated={(expense) => setExpenses((prev) => [expense, ...prev])}
      />
      <ExpenseList
        expenses={expenses}
        onDeleted={(id) =>
          setExpenses((prev) => prev.filter((expense) => expense.id !== id))
        }
      />
    </div>
  );
}
