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
    name: 'Freelance',
    type: CategoryType.INCOME,
    icon: 'cash',
    color: '#14B8A6',
  },
  {
    name: 'Rental Income',
    type: CategoryType.INCOME,
    icon: 'home',
    color: '#0D9488',
  },
  {
    name: 'Interest',
    type: CategoryType.INCOME,
    icon: 'coins',
    color: '#A855F7',
  },
  {
    name: 'Gifts Received',
    type: CategoryType.INCOME,
    icon: 'gift',
    color: '#34D399',
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
    name: 'Groceries',
    type: CategoryType.EXPENSE,
    icon: 'shopping-cart',
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
    name: 'Rent & Housing',
    type: CategoryType.EXPENSE,
    icon: 'home',
    color: '#EF4444',
  },
  {
    name: 'Travel',
    type: CategoryType.EXPENSE,
    icon: 'plane',
    color: '#3B82F6',
  },
  {
    name: 'Education',
    type: CategoryType.EXPENSE,
    icon: 'graduation-cap',
    color: '#6366F1',
  },
  {
    name: 'Personal Care',
    type: CategoryType.EXPENSE,
    icon: 'personal-care',
    color: '#F43F5E',
  },
  {
    name: 'Fitness & Sports',
    type: CategoryType.EXPENSE,
    icon: 'fitness',
    color: '#06B6D4',
  },
  {
    name: 'Pets',
    type: CategoryType.EXPENSE,
    icon: 'paw',
    color: '#EAB308',
  },
  {
    name: 'Gifts & Donations',
    type: CategoryType.EXPENSE,
    icon: 'gift',
    color: '#F472B6',
  },
  {
    name: 'Insurance',
    type: CategoryType.EXPENSE,
    icon: 'insurance',
    color: '#0EA5E9',
  },
  {
    name: 'Subscriptions',
    type: CategoryType.EXPENSE,
    icon: 'subscription',
    color: '#A855F7',
  },
  {
    name: 'Other Expense',
    type: CategoryType.EXPENSE,
    icon: 'more-horizontal',
    color: '#64748B',
  },
];
