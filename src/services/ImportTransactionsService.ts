import csvParse from 'csv-parse';
import fs from 'fs';

import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  filePath: string;
}

interface PreTransaction {
  title: string;
  type: string;
  value: number;
  category: string;
}

interface ParseCSVDataResponse {
  categories: string[];
  transactions: PreTransaction[];
}

class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const parsedCSVData = await this.readCSVFile(filePath);
    const { categories, transactions } = this.parseCSVData(parsedCSVData);

    const existingCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const createCategories = categories.filter(
      category => !existingCategories.find(cat => cat.title === category),
    );

    const createdCategories = categoriesRepository.create(
      createCategories.map(category => ({ title: category })),
    );
    await categoriesRepository.save(createdCategories);

    const allCategories = [...createdCategories, ...existingCategories];

    const createdTransactions = transactions.map(transaction => {
      const { title, type, value, category } = transaction;
      const transatcionType = type as 'income' | 'outcome';

      return transactionsRepository.create({
        title,
        type: transatcionType,
        value,
        category: allCategories.find(cat => cat.title === category),
      });
    });

    return transactionsRepository.save(createdTransactions);
  }

  private parseCSVData(data: string[][]): ParseCSVDataResponse {
    const initialValue: ParseCSVDataResponse = {
      categories: [],
      transactions: [],
    };

    return data.reduce((response, transaction) => {
      const [title, type, value, category] = transaction;
      if (!title || !type || !value || !category) return response;

      if (!response.categories.includes(category))
        response.categories.push(category);

      response.transactions.push({
        title,
        type,
        value: +value,
        category,
      });

      return response;
    }, initialValue);
  }

  private async readCSVFile(csvFilePath: string): Promise<Array<string[]>> {
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const lines: Array<string[]> = [];

    parseCSV.on('data', line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return lines;
  }
}

export default ImportTransactionsService;
