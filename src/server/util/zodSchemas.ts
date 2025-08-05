import { z } from 'zod';

export const cleanIdStringSchema = z.string().regex(/^[a-zA-Z0-9]+$/, {
  message: 'String must only contain letters',
});
