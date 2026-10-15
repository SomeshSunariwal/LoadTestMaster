import { z } from 'zod';
import { pairSchema } from './schema';

const multipartFieldSchema = pairSchema.extend({
  contentType: z.string().max(200).default(''),
  description: z.string().max(1000).default(''),
  file: z
    .object({
      name: z.string().max(500),
      data: z
        .string()
        .max(800000)
        .regex(/^[A-Za-z0-9+/]*={0,2}$/),
      type: z.string().max(200),
    })
    .optional(),
});
export type MultipartField = z.infer<typeof multipartFieldSchema>;

export function parseMultipartFields(body: string) {
  if (!body.trim()) return [];
  try {
    return z.array(multipartFieldSchema).max(100).parse(JSON.parse(body));
  } catch {
    throw new Error('Invalid multipart fields. Use the Multipart Form field editor.');
  }
}
