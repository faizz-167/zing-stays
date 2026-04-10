import { z } from 'zod';

export const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  type: z.enum(['area_guide', 'student_guide', 'comparison', 'rent_advice', 'locality_insight']),
  body: z.string().min(1, 'Body is required'),
  isPublished: z.boolean().default(false),
  cityId: z.number().int().positive().nullable().default(null),
  localityId: z.number().int().positive().nullable().default(null),
});

export type ContentFormValues = z.infer<typeof contentSchema>;
