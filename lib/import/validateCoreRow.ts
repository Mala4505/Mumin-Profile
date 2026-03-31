import { z } from 'zod'

export const CoreRowSchema = z.object({
  ITS_NO: z.string().min(1, 'ITS_NO is required').regex(/^\d+$/, 'ITS_NO must be numeric'),
  Name: z.string().min(1, 'Name is required').max(100),
  Gender: z.enum(['M', 'F'], { error: "Gender must be 'M' or 'F'" }),
  DOB: z.string().optional(),
  Balig: z.enum(['Balig', 'Ghair Balig'], { error: "Balig must be 'Balig' or 'Ghair Balig'" }),
  Sabeel_No: z.string().min(1, 'Sabeel_No is required').max(20),
  PACI_NO: z.string().min(1, 'PACI_NO is required').max(20),
  Floor_No: z.string().max(20).optional(),
  Flat_No: z.string().max(20).optional(),
  Building: z.string().min(1, 'Building is required').max(100),
  SubSector: z.string().min(1, 'SubSector is required').max(100),
  Sector: z.string().min(1, 'Sector is required').max(100),
  // Optional new columns — all handle blank cells from old CSVs gracefully
  Role: z.preprocess(
    v => (v === '' || v == null ? undefined : v),
    z.enum(['Mumin', 'Masool', 'Musaid']).optional()
  ),
  Phone: z.string().max(20).optional().transform(v => v || undefined),
  Street: z.string().max(200).optional().transform(v => v || undefined),
  Landmark: z.string().max(200).optional().transform(v => v || undefined),
  Family_Type: z.preprocess(
    v => (v === '' || v == null ? undefined : v),
    z.enum(['Family', 'Bachelor']).optional()
  ),
})

export type CoreRowInput = z.infer<typeof CoreRowSchema>

export const REQUIRED_HEADERS = ['ITS_NO', 'Name', 'Gender', 'Balig', 'Sabeel_No', 'PACI_NO', 'Building', 'SubSector', 'Sector'] as const

export function validateHeaders(headers: string[]): string[] {
  const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h))
  return missing
}
