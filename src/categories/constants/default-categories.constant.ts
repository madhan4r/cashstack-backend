import { CategoryType } from '../enums';

interface DefaultCategorySeed {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  {
    name: 'Salary',
    type: CategoryType.INCOME,
    icon: 'briefcase',
    color: '#22C55E',
  },
  {
    name: 'Business',
    type: CategoryType.INCOME,
    icon: 'store',
    color: '#16A34A',
  },
  {
    name: 'Investment',
    type: CategoryType.INCOME,
    icon: 'trending-up',
    color: '#15803D',
  },
  {
    name: 'Other Income',
    type: CategoryType.INCOME,
    icon: 'plus-circle',
    color: '#4ADE80',
  },
  {
    name: 'Food & Dining',
    type: CategoryType.EXPENSE,
    icon: 'utensils',
    color: '#F97316',
  },
  {
    name: 'Transport',
    type: CategoryType.EXPENSE,
    icon: 'car',
    color: '#F59E0B',
  },
  {
    name: 'Shopping',
    type: CategoryType.EXPENSE,
    icon: 'shopping-bag',
    color: '#EC4899',
  },
  {
    name: 'Bills & Utilities',
    type: CategoryType.EXPENSE,
    icon: 'file-text',
    color: '#EF4444',
  },
  {
    name: 'Entertainment',
    type: CategoryType.EXPENSE,
    icon: 'film',
    color: '#8B5CF6',
  },
  {
    name: 'Health',
    type: CategoryType.EXPENSE,
    icon: 'heart',
    color: '#06B6D4',
  },
  {
    name: 'Other Expense',
    type: CategoryType.EXPENSE,
    icon: 'more-horizontal',
    color: '#64748B',
  },
];
