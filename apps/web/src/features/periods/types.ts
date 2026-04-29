import { z } from 'zod';
import { DaySchema } from '@maxflow/contracts/v1/schemas';

export const dayFormSchema = DaySchema.extend({
  periodId: z.string().min(1, 'Select a period.')
});

export type PeriodFormValues = {
  id: string;
};

export type DayFormValues = z.infer<typeof dayFormSchema>;
