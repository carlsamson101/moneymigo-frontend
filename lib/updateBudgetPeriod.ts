// lib/updateBudgetPeriod.ts
import axios from 'axios';
import { getToken } from './auth';

export const updateBudgetPeriod = async (period: string) => {
  const user = await getToken();
  if (!user) throw new Error('User not authenticated');

  const response = await axios.put(`http://localhost:5000/auth/${user.id}/budget-period`, {
    budgetPeriod: period,
  });

  return response.data;
};
