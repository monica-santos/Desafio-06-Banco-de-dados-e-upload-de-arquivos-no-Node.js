import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const initialValues: Balance = {
      income: 0,
      outcome: 0,
      total: 0,
    };

    return transactions.reduce((acc, cur) => {
      if (cur.type === 'income') {
        acc.income += cur.value;
      } else {
        acc.outcome += cur.value;
      }
      acc.total = acc.income - acc.outcome;
      return acc;
    }, initialValues);
  }
}

export default TransactionsRepository;
