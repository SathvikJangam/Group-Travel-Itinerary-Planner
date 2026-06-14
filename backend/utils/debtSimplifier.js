export const simplifyDebts = (expenses) => {
  const balances = {}; // Map of userId -> net balance amount

  // 1. Calculate net balance for every single person
  expenses.forEach(expense => {
    const payer = expense.paidBy.toString();
    balances[payer] = (balances[payer] || 0) + expense.totalAmount;

    expense.splitAmong.forEach(split => {
      const ower = split.userId.toString();
      balances[ower] = (balances[ower] || 0) - split.amountOwed;
    });
  });

  // 2. Separate members into creditors (positive balance) and debtors (negative balance)
  const creditors = [];
  const debtors = [];

  Object.keys(balances).forEach(userId => {
    const amount = balances[userId];
    if (amount > 0.01) creditors.push({ userId, amount });
    else if (amount < -0.01) debtors.push({ userId, amount: Math.abs(amount) });
  });

  const transactions = [];

  // 3. Greedy matching strategy
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(settledAmount * 100) / 100
    });

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
};