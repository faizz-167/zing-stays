import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Please select a star rating.').max(5),
  body: z.string().min(20, 'Review must be at least 20 characters.').max(2000),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
