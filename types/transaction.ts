export type UnifiedTransaction = {
  id: string;
  title: string;
  amount: number;
  type: 'budget' | 'expense';
  category?: string;
  date: string;
};
