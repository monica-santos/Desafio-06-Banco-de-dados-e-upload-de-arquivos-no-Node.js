import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    let transactionCategory;
    const balance = await transactionsRepository.getBalance();
    if (type === 'outcome' && value > balance.total) {
      throw new AppError('Could not create transaction');
    }

    const existingCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!existingCategory) {
      transactionCategory = await categoriesRepository.save({
        title: category,
      });
    }

    return transactionsRepository.save({
      title,
      type,
      value,
      category: existingCategory || transactionCategory,
    });
  }
}

export default CreateTransactionService;
