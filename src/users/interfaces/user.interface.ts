export interface SanitizedUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  preferredCurrency: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
