-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "occurredOn" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Expense_occurredOn_idx" ON "Expense"("occurredOn");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");
