import type { ObjectId, WithId } from 'mongodb';

export type UserRole = 'student' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type EventStatus = 'draft' | 'published' | 'archived';
export type RegistrationStatus = 'registered' | 'cancelled' | 'checked-in';

export type UserDocument = {
  name: string;
  studentId: string;
  email: string;
  passwordHash: string;
  major: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredUser = WithId<UserDocument>;

export type EventDocument = {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  location: string;
  category: 'Học thuật' | 'CLB' | 'Tình nguyện' | 'Giải trí';
  organizer: string;
  imageKey?: string;
  imageUrl?: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  summarySource: string;
  status: EventStatus;
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
};

export type RegistrationDocument = {
  userId: ObjectId;
  eventId: string;
  status: RegistrationStatus;
  registeredAt: Date;
  updatedAt: Date;
  checkedInAt?: Date;
};

export type SavedEventDocument = {
  userId: ObjectId;
  eventId: string;
  savedAt: Date;
};

export type PublicUser = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  major: string;
  role: UserRole;
  status: UserStatus;
};

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: EventDocument['category'];
  organizer: string;
  capacity: number;
  checkedInCount: number;
  summarySource: string;
  imageKey?: string;
  imageUrl?: string;
  status?: EventStatus;
};

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    studentId: user.studentId,
    email: user.email,
    major: user.major,
    role: user.role,
    status: user.status,
  };
}

export function toPublicEvent(event: EventDocument): PublicEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    location: event.location,
    category: event.category,
    organizer: event.organizer,
    capacity: event.capacity,
    checkedInCount: event.checkedInCount,
    summarySource: event.summarySource,
    imageKey: event.imageKey,
    imageUrl: event.imageUrl,
    status: event.status,
  };
}
