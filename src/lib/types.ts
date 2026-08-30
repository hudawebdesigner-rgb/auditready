import type { Category } from "@/generated/prisma/client";

export type ExpenseDTO = {
  id: string;
  description: string;
  amountCents: number;
  category: Category;
  occurredOn: string;
};
