export interface Participant {
  id: number;
  firstName: string;
  lastName: string;
  emailOrPhone: string;
  organization: string | null;
  status: 'registered' | 'present';
  qrCodeToken: string;
  scannedAt: string | null;
  createdAt: string;
}
