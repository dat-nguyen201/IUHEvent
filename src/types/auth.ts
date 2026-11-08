export type UserRole = 'student' | 'admin' | 'organizer';
export type UserStatus = 'active' | 'suspended';

export type AuthUser = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  major: string;
  role: UserRole;
  status: UserStatus;
  organizerId?: string;
  organizerName?: string;
};

export type RegisterInput = {
  name: string;
  studentId: string;
  email: string;
  password: string;
};
