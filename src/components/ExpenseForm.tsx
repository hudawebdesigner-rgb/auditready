"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/validations";
import type { ExpenseDTO } from "@/lib/types";

type Props = {
  onCreated: (expense: ExpenseDTO) => void;
};

export function ExpenseForm({ onCreated }: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("OTHER");
  const [occurredOn, setOccurredOn] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amountDollars: Number(amount),
          category,
          occurredOn,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.formErrors?.[0] ?? "Failed to add expense");
      }

      const created: ExpenseDTO = await res.json();
      onCreated(created);
      setDescription("");
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="border rounded px-2 py-1"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium">
          Amount ($)
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="border rounded px-2 py-1 w-28"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="border rounded px-2 py-1"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="occurredOn" className="text-sm font-medium">
          Date
        </label>
        <input
          id="occurredOn"
          type="date"
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          required
          className="border rounded px-2 py-1"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white rounded px-4 py-1.5 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add expense"}
      </button>

      {error && <p className="text-red-600 text-sm w-full">{error}</p>}
    </form>
  );
}
