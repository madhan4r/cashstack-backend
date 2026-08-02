export const IS_PUBLIC_KEY = 'isPublic';

export const AUTH_MESSAGES = {
  REGISTER_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  TOKEN_REFRESH_SUCCESS: 'Token refreshed successfully',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
  USER_NOT_FOUND: 'User not found',
  FORGOT_PASSWORD_SUCCESS:
    'If an account exists for this email, a password reset link has been sent',
  RESET_PASSWORD_SUCCESS:
    'Password reset successfully. Please log in with your new password',
  INVALID_RESET_TOKEN: 'Invalid or expired password reset token',
  CHANGE_PASSWORD_SUCCESS: 'Password changed successfully',
  INCORRECT_CURRENT_PASSWORD: 'Current password is incorrect',
} as const;

export const USER_MESSAGES = {
  PROFILE_FETCHED: 'Profile fetched successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
} as const;

export const ACCOUNT_MESSAGES = {
  CREATED: 'Account created successfully',
  UPDATED: 'Account updated successfully',
  DELETED: 'Account deleted successfully',
  ARCHIVED: 'Account archived successfully',
  UNARCHIVED: 'Account unarchived successfully',
  FETCHED: 'Account fetched successfully',
  LIST_FETCHED: 'Accounts fetched successfully',
  STATS_FETCHED: 'Account statistics fetched successfully',
  NOT_FOUND: 'Account not found',
  DUPLICATE_NAME: 'An account with this name already exists',
} as const;

export const TRANSACTION_MESSAGES = {
  CREATED: 'Transaction created successfully',
  UPDATED: 'Transaction updated successfully',
  DELETED: 'Transaction deleted successfully',
  FETCHED: 'Transaction fetched successfully',
  LIST_FETCHED: 'Transactions fetched successfully',
  NOT_FOUND: 'Transaction not found',
  ACCOUNT_NOT_FOUND: 'One or more accounts could not be found',
  CATEGORY_NOT_FOUND: 'Category could not be found',
  CATEGORY_TYPE_MISMATCH: 'Category type does not match transaction type',
  INVALID_TRANSFER_SAME_ACCOUNT:
    'Source and destination accounts must be different',
  ACCOUNT_CATEGORY_NOT_ALLOWED_FOR_TRANSFER:
    'accountId and categoryId are not applicable to TRANSFER transactions',
  TRANSFER_ACCOUNTS_REQUIRED:
    'fromAccountId and toAccountId are required for TRANSFER transactions',
  ACCOUNT_CATEGORY_REQUIRED:
    'accountId and categoryId are required for INCOME/EXPENSE transactions',
} as const;

export const CATEGORY_MESSAGES = {
  CREATED: 'Category created successfully',
  UPDATED: 'Category updated successfully',
  DELETED: 'Category deleted successfully',
  FETCHED: 'Category fetched successfully',
  LIST_FETCHED: 'Categories fetched successfully',
  NOT_FOUND: 'Category not found',
  DUPLICATE_NAME: 'A category with this name already exists for this type',
  DEFAULT_CANNOT_BE_MODIFIED: 'Default categories cannot be modified',
  DEFAULT_CANNOT_BE_DELETED: 'Default categories cannot be deleted',
  ARCHIVED: 'Category archived successfully',
  UNARCHIVED: 'Category unarchived successfully',
  HAS_TRANSACTIONS:
    'This category has transactions and cannot be deleted — archive it instead',
} as const;

export const DASHBOARD_MESSAGES = {
  FETCHED: 'Dashboard fetched successfully.',
} as const;

export const REPORT_MESSAGES = {
  SUMMARY_FETCHED: 'Summary report fetched successfully',
  MONTHLY_FETCHED: 'Monthly report fetched successfully',
  YEARLY_FETCHED: 'Yearly report fetched successfully',
  CATEGORY_FETCHED: 'Category report fetched successfully',
  ACCOUNT_FETCHED: 'Account report fetched successfully',
  CASH_FLOW_FETCHED: 'Cash flow report fetched successfully',
} as const;

export const RECURRING_MESSAGES = {
  CREATED: 'Recurring transaction created successfully',
  UPDATED: 'Recurring transaction updated successfully',
  DELETED: 'Recurring transaction deleted successfully',
  FETCHED: 'Recurring transaction fetched successfully',
  LIST_FETCHED: 'Recurring transactions fetched successfully',
  UPCOMING_FETCHED: 'Upcoming schedule fetched successfully',
  HISTORY_FETCHED: 'Recurring history fetched successfully',
  PAUSED: 'Recurring transaction paused successfully',
  RESUMED: 'Recurring transaction resumed successfully',
  NOT_FOUND: 'Recurring transaction not found',
  TRANSFER_NOT_SUPPORTED: 'Recurring transfers are not supported',
  CATEGORY_TYPE_MISMATCH:
    'Category type does not match the recurring transaction type',
  ALREADY_PAUSED: 'Recurring transaction is already paused',
  ALREADY_ACTIVE: 'Recurring transaction is already active',
  COMPLETED_CANNOT_CHANGE_STATUS:
    'This recurring transaction has completed and its status can no longer be changed',
} as const;

export const FEEDBACK_MESSAGES = {
  SUBMITTED: 'Thanks for the feedback!',
} as const;

export const BUDGET_MESSAGES = {
  FETCHED: 'Budget fetched successfully',
  SET: 'Budget set successfully',
  CLEARED: 'Budget cleared successfully',
  CATEGORY_BUDGETS_FETCHED: 'Category budgets fetched successfully',
  CATEGORY_BUDGET_SET: 'Category budget set successfully',
  CATEGORY_BUDGET_CLEARED: 'Category budget cleared successfully',
} as const;

export const HOUSEHOLD_MESSAGES = {
  INVITED: 'Invite sent',
  INVITE_ACCEPTED: "You've joined the household",
  INVITE_DECLINED: 'Invite declined',
  INVITE_CANCELLED: 'Invite cancelled',
  INVITE_NOT_FOUND: 'Invite not found',
  LEFT: "You've left the household",
  FETCHED: 'Household fetched successfully',
  INVITES_FETCHED: 'Pending invites fetched successfully',
  CANNOT_INVITE_SELF: "You can't invite yourself",
  ALREADY_A_MEMBER: 'This person is already in your household',
  ALREADY_IN_ANOTHER_HOUSEHOLD:
    'Leave your current household before joining another one',
} as const;

export const SAVINGS_GOAL_MESSAGES = {
  CREATED: 'Savings goal created successfully',
  UPDATED: 'Savings goal updated successfully',
  DELETED: 'Savings goal deleted successfully',
  FETCHED: 'Savings goal fetched successfully',
  LIST_FETCHED: 'Savings goals fetched successfully',
  CONTRIBUTED: 'Contribution recorded successfully',
  NOT_FOUND: 'Savings goal not found',
  WITHDRAWAL_EXCEEDS_BALANCE:
    "Withdrawal can't exceed the current saved amount",
} as const;
