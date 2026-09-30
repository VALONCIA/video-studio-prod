import { z } from 'zod';

const uuid = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const signedUrl = z.string().url();
const status = z.enum([
  'queued',
  'starting',
  'running',
  'completed',
  'failed',
  'cancel_requested',
  'cancelled',
]);

export const backendErrorSchema = z.object({
  error: z.object({ code: z.string().min(1), message: z.string() }),
});

export const deviceSessionSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive(),
});

export const capabilitiesSchema = z.object({
  status: z.enum(['ok', 'degraded', 'unknown']),
  generation_available: z.boolean(),
  editing: z.boolean(),
  ai_broll: z.boolean(),
  video_generation: z.boolean(),
  variants: z.boolean(),
  revisions: z.boolean(),
  best_takes: z.boolean(),
  takes_llm: z.boolean(),
  audio_cleanup: z.boolean(),
  smart_crop: z.boolean(),
  pipelines: z.array(z.object({ id: z.string(), enabled: z.boolean() })),
  features: z.object({
    text_to_video: z.boolean(),
    image_generation: z.boolean(),
    tts: z.boolean(),
    captions: z.boolean(),
    music: z.boolean(),
    stock_video: z.boolean(),
  }),
  limits: z.object({
    durations_seconds: z.array(z.number().int().positive()),
    aspect_ratios: z.array(z.enum(['9:16', '1:1', '16:9'])),
    quality: z.array(z.enum(['standard', 'cinematic'])),
    max_prompt_chars: z.number().int().positive(),
    max_assets_per_edit: z.number().int().positive(),
    uploads: z.boolean(),
  }),
});

export const assetSchema = z.object({
  id: uuid,
  project_id: uuid.nullable(),
  filename: z.string(),
  content_type: z.string(),
  purpose: z.string(),
  size_bytes: z.number().int().nonnegative().nullable(),
  status: z.enum(['pending', 'uploaded']),
  created_at: timestamp,
});

export const cutRangeSchema = z
  .object({
    source: z.number().int().min(0).max(9),
    start: z.number().nonnegative(),
    end: z.number().positive(),
  })
  .refine((range) => range.end > range.start);

export const warningSchema = z.string();
export const insightsSchema = z.record(
  z.string(),
  z.union([z.number(), z.boolean()]),
);
export const orderedSourceSchema = z.object({
  asset_id: uuid,
  filename: z.string(),
  duration_seconds: z.number().nonnegative().nullable(),
  playback_url: signedUrl.nullable(),
});

export const versionSchema = z.object({
  id: uuid,
  version: z.number().int().positive(),
  instruction: z.string(),
  status,
  progress: z.number().int().min(0).max(100),
  output_url: signedUrl.nullable(),
  thumbnail_url: signedUrl.nullable(),
  kept_ranges: z.array(cutRangeSchema),
  created_at: timestamp,
});

export const variantInfoSchema = z.object({
  strategy: z.string(),
  label: z.string(),
});
export const editSchema = z.object({
  id: uuid,
  project_id: uuid.nullable(),
  kind: z.enum(['edit', 'revision', 'variant']),
  parent_id: uuid.nullable(),
  version: z.number().int().positive().nullable(),
  status,
  progress: z.number().int().min(0).max(100),
  stage: z.string().nullable(),
  display_stage: z.string().nullable(),
  instruction: z.string(),
  platform: z.string().nullable(),
  aspect_ratio: z.string(),
  duration_target_seconds: z.number().int().nonnegative(),
  duration_seconds: z.number().nonnegative().nullable(),
  variant: variantInfoSchema.nullable(),
  output_url: signedUrl.nullable(),
  thumbnail_url: signedUrl.nullable(),
  warnings: z.array(warningSchema),
  insights: insightsSchema,
  kept_ranges: z.array(cutRangeSchema),
  sources: z.array(orderedSourceSchema),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  versions: z.array(versionSchema),
  created_at: timestamp,
  started_at: timestamp.nullable(),
  completed_at: timestamp.nullable(),
  updated_at: timestamp,
});
export const editListSchema = z.object({ items: z.array(editSchema) });
export const editAcceptedSchema = z.object({
  id: uuid,
  project_id: uuid.nullable(),
  status,
  progress: z.number().int().min(0).max(100),
  poll_url: z.string().startsWith('/v1/edits/'),
});

export const projectSchema = z.object({
  id: uuid,
  name: z.string(),
  created_at: timestamp,
  updated_at: timestamp,
  edit_count: z.number().int().nonnegative(),
  latest_edit: editSchema.nullable(),
});
export const projectDetailSchema = projectSchema.extend({
  assets: z.array(assetSchema),
  edits: z.array(editSchema),
});
export const projectListSchema = z.object({ items: z.array(projectSchema) });

export const presignSchema = z.object({
  upload_id: z.string().min(1),
  asset_id: uuid,
  method: z.literal('PUT'),
  url: signedUrl,
  headers: z.record(z.string(), z.string()),
  key: z.string(),
  expires_in: z.number().int().positive(),
  max_bytes: z.number().int().positive(),
});

export type Capabilities = z.infer<typeof capabilitiesSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Edit = z.infer<typeof editSchema>;
export type EditAccepted = z.infer<typeof editAcceptedSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type Presign = z.infer<typeof presignSchema>;
