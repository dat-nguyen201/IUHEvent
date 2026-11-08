import type { ObjectId, WithId } from 'mongodb';

export type UserRole = 'student' | 'admin' | 'organizer';
export type UserStatus = 'active' | 'suspended';
export type EventStatus = 'draft' | 'published' | 'archived';
export type RegistrationStatus = 'registered' | 'cancelled' | 'checked-in';

export type UserDocument = {
  name: string;
  studentId: string;
  email: string;
  passwordHash: string;
  credentialVersion?: number;
  major: string;
  role: UserRole;
  status: UserStatus;
  organizerId?: ObjectId;
  organizerName?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PasswordResetDocument = {
  _id?: string;
  userId: ObjectId;
  codeHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
};

export type StoredUser = WithId<UserDocument>;

export type OrganizerType = 'faculty' | 'union' | 'club' | 'center';

export type OrganizerDocument = {
  accountId: ObjectId;
  name: string;
  shortName: string;
  type: OrganizerType;
  description: string;
  contactEmail: string;
  location: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicOrganizer = {
  id: string;
  name: string;
  shortName: string;
  type: OrganizerType;
  description: string;
  contactEmail: string;
  location: string;
  color: string;
};

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

export type ReviewDocument = {
  _id?: ObjectId;
  eventId: string;
  userId: ObjectId;
  userName: string;
  userStudentId: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  tags: string[];
  comment: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationType = 'event' | 'point' | 'system';

export type NotificationDocument = {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  body: string;
  type: NotificationType;
  eventId?: string;
  read: boolean;
  createdAt: Date;
};

export type PublicUser = {
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

export function toPublicOrganizer(organizer: WithId<OrganizerDocument>): PublicOrganizer {
  return {
    id: organizer._id.toHexString(),
    name: organizer.name,
    shortName: organizer.shortName,
    type: organizer.type,
    description: organizer.description,
    contactEmail: organizer.contactEmail,
    location: organizer.location,
    color: organizer.color,
  };
}

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: EventDocument['category'];
  organizer: string;
  capacity: number;
  registeredCount: number;
  remainingSpots: number;
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
    ...(user.organizerId ? { organizerId: user.organizerId.toHexString() } : {}),
    ...(user.organizerName ? { organizerName: user.organizerName } : {}),
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
    registeredCount: event.registeredCount,
    remainingSpots: Math.max(0, event.capacity - event.registeredCount),
    checkedInCount: event.checkedInCount,
    summarySource: event.summarySource,
    imageKey: event.imageKey,
    imageUrl: event.imageUrl,
    status: event.status,
  };
}
