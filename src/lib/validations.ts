import { z } from "zod";

export const CATEGORIES = [
  "FOOD",
  "TRANSPORT",
  "HOUSING",
  "UTILITIES",
  "ENTERTAINMENT",
  "HEALTH",
  "OTHER",
] as const;

export const expenseInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(200),
  amountDollars: z.number().positive("Amount must be greater than 0"),
  category: z.enum(CATEGORIES).default("OTHER"),
  occurredOn: z.coerce.date(),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
