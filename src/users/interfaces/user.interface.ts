export interface SanitizedUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  preferredCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}
