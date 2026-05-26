import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Normalises a multipart/form-data value into a `string[]`.
 *
 * Handles every shape clients actually send:
 *  - single string          → `"Hypertension"`
 *  - comma-separated string → `"Chemotherapy,Radiation"`
 *  - JSON-stringified array → `'["Diabetes","Hypertension"]'`
 *  - real array (repeated keys or pre-parsed) → `["a","b"]`
 *  - nullish / empty        → `undefined`
 */
export function parseStringArray(value: unknown): string[] | undefined {
  // already an array (repeated form keys or pre-parsed)
  if (Array.isArray(value)) {
    return value.flatMap((v) => splitAndTrim(String(v)));
  }

  if (value == null || value === '') {
    return undefined;
  }

  const raw = String(value).trim();

  if (raw === '') {
    return undefined;
  }

  // attempt JSON parse for `["a","b"]` shaped strings
  if (raw.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((v) => splitAndTrim(String(v)));
      }
    } catch {
      // not valid JSON – fall through to comma-split
    }
  }

  return splitAndTrim(raw);
}

function splitAndTrim(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Property decorator – apply on any `string[]` DTO field that arrives via
 * `multipart/form-data`.
 *
 * @example
 *   @TransformStringArray()
 *   @IsOptional()
 *   @IsArray()
 *   @IsString({ each: true })
 *   diseases?: string[];
 */
export function TransformStringArray(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => parseStringArray(value));
}
