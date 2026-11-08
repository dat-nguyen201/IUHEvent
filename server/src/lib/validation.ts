import { z } from 'zod';

export const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  studentId: z.string().trim().min(2).max(32),
  email: emailSchema,
  password: z.string().min(8).max(128),
}).strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
}).strict();

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  studentId: z.string().trim().min(2).max(32).optional(),
  major: z.string().trim().min(2).max(120).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one profile field is required.');

const eventFields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(1).max(8000),
  startsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid event date.'),
  location: z.string().trim().min(2).max(240),
  category: z.enum(['Học thuật', 'CLB', 'Tình nguyện', 'Giải trí']),
  organizer: z.string().trim().min(2).max(160),
  capacity: z.number().int().min(1).max(100_000),
  summarySource: z.string().trim().max(8000).default(''),
  imageKey: z.string().trim().max(120).optional(),
  imageUrl: z.string().url().max(2048).optional(),
};

export const createEventSchema = z.object({
  ...eventFields,
  status: z.enum(['draft', 'published']).default('draft'),
}).strict();

export const updateEventSchema = z.object({
  title: eventFields.title.optional(),
  description: eventFields.description.optional(),
  startsAt: eventFields.startsAt.optional(),
  location: eventFields.location.optional(),
  category: eventFields.category.optional(),
  organizer: eventFields.organizer.optional(),
  capacity: eventFields.capacity.optional(),
  summarySource: eventFields.summarySource.optional(),
  imageKey: eventFields.imageKey,
  imageUrl: eventFields.imageUrl,
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one event field is required.');

export const eventStatusSchema = z.object({ status: z.enum(['draft', 'published', 'archived']) }).strict();
export const userStatusSchema = z.object({ status: z.enum(['active', 'suspended']) }).strict();
export const checkInSchema = z.object({ qrValue: z.string().trim().min(1).max(500) }).strict();

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().trim().max(50)).default([]),
  comment: z.string().trim().max(1000).default(''),
}).strict();
