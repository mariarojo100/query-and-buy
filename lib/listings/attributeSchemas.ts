/**
 * Category-specific listing attributes ("facets").
 *
 * Each category has a set of optional structured fields — a car wants mileage,
 * transmission, doors; a phone wants storage and RAM; an apartment wants
 * bedrooms and size. Values are stored on `Listing.attributes` (jsonb) as a flat
 * `{ key: string }` map. Everything here is presentation/validation metadata; the
 * DB column already exists, so no migration is needed.
 *
 * Field keys are GLOBALLY unique — a `transmission` means the same thing wherever
 * it appears — so a listing's stored attributes can be labelled for display from
 * the {@link FIELDS} catalog alone, without knowing its category.
 */

export type AttrType = 'text' | 'number' | 'select'

export type AttrFieldDef = {
  label: string
  type: AttrType
  /** For `select` — option values (value === visible label). */
  options?: readonly string[]
  /** Rendered after the value, e.g. "120,000 km". */
  unit?: string
  placeholder?: string
  /** Extra names the AI might use for this field, for draft-fill matching. */
  aliases?: readonly string[]
  /** Max length for `text` (default 60). */
  maxLen?: number
}

/** A field with its key attached — what the form/display actually consume. */
export type AttrField = AttrFieldDef & { key: string }

// ---- Field catalogue (key → definition) -----------------------------------
// Insertion order here is the canonical display order.
const FIELDS = {
  // vehicles
  make: { label: 'Make', type: 'text', aliases: ['brand', 'manufacturer'], placeholder: 'e.g. Toyota' },
  model: { label: 'Model', type: 'text', placeholder: 'e.g. Land Cruiser' },
  trim: { label: 'Trim', type: 'text', placeholder: 'e.g. GXR' },
  year: { label: 'Year', type: 'number', aliases: ['model year'], placeholder: 'e.g. 2021' },
  mileage_km: { label: 'Mileage', type: 'number', unit: 'km', aliases: ['km', 'kilometers', 'kilometres', 'odometer'], placeholder: 'e.g. 45000' },
  transmission: { label: 'Transmission', type: 'select', options: ['Automatic', 'Manual'], aliases: ['gearbox'] },
  fuel_type: { label: 'Fuel type', type: 'select', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'], aliases: ['fuel'] },
  body_type: { label: 'Body type', type: 'select', options: ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Pickup', 'Van', 'Convertible', 'Crossover', 'Wagon'] },
  drivetrain: { label: 'Drivetrain', type: 'select', options: ['FWD', 'RWD', 'AWD', '4WD'] },
  doors: { label: 'Doors', type: 'select', options: ['2', '3', '4', '5'] },
  seats: { label: 'Seats', type: 'number', placeholder: 'e.g. 5' },
  engine_cc: { label: 'Engine', type: 'number', unit: 'cc', aliases: ['engine size', 'displacement'] },
  regional_specs: { label: 'Regional specs', type: 'select', options: ['GCC', 'American', 'European', 'Japanese', 'Other'], aliases: ['specs', 'specification'] },
  warranty: { label: 'Warranty', type: 'select', options: ['Yes', 'No'] },
  exterior_color: { label: 'Exterior colour', type: 'text', aliases: ['colour', 'color'], placeholder: 'e.g. White' },

  // motorcycles / boats
  length_ft: { label: 'Length', type: 'number', unit: 'ft', aliases: ['length'] },

  // auto parts
  part_type: { label: 'Part type', type: 'text', placeholder: 'e.g. Brake pads' },
  compatible_with: { label: 'Compatible with', type: 'text', aliases: ['fits', 'compatibility'], placeholder: 'e.g. Nissan Patrol' },

  // property
  bedrooms: { label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5', '6', '7+'], aliases: ['beds', 'br'] },
  bathrooms: { label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4', '5', '6+'], aliases: ['baths', 'ba'] },
  size_sqft: { label: 'Size', type: 'number', unit: 'sq ft', aliases: ['area', 'sqft', 'square feet', 'built up area'], placeholder: 'e.g. 1200' },
  furnishing: { label: 'Furnishing', type: 'select', options: ['Furnished', 'Semi-furnished', 'Unfurnished'], aliases: ['furnished'] },
  parking: { label: 'Parking', type: 'select', options: ['Yes', 'No'] },
  floor: { label: 'Floor', type: 'number', placeholder: 'e.g. 12' },
  rent_period: { label: 'Rent period', type: 'select', options: ['Yearly', 'Monthly', 'Weekly'], aliases: ['payment', 'rent'] },
  completion: { label: 'Completion', type: 'select', options: ['Ready', 'Off-plan'] },

  // electronics / mobiles
  brand: { label: 'Brand', type: 'text', aliases: ['make', 'manufacturer'], placeholder: 'e.g. Apple' },
  storage: { label: 'Storage', type: 'select', options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], aliases: ['capacity', 'storage capacity'] },
  storage_gb: { label: 'Storage', type: 'number', unit: 'GB', aliases: ['ssd', 'hdd', 'disk'] },
  storage_type: { label: 'Storage type', type: 'select', options: ['SSD', 'HDD', 'eMMC'] },
  ram: { label: 'RAM', type: 'select', options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB'], aliases: ['memory'] },
  screen_size_in: { label: 'Screen size', type: 'number', unit: 'in', aliases: ['screen', 'display', 'display size'] },
  resolution: { label: 'Resolution', type: 'select', options: ['HD', 'Full HD', '2K', '4K', '8K'] },
  processor: { label: 'Processor', type: 'text', aliases: ['cpu', 'chip'], placeholder: 'e.g. Intel i7' },
  megapixels: { label: 'Megapixels', type: 'number', unit: 'MP', aliases: ['mp', 'resolution'] },
  battery_health: { label: 'Battery health', type: 'number', unit: '%', aliases: ['battery'] },
  network: { label: 'Network', type: 'select', options: ['4G', '5G'] },
  dual_sim: { label: 'Dual SIM', type: 'select', options: ['Yes', 'No'] },
  color: { label: 'Colour', type: 'text', aliases: ['colour'], placeholder: 'e.g. Space Grey' },

  // home & garden / fashion / generic
  type: { label: 'Type', type: 'text', placeholder: 'e.g. Sofa' },
  material: { label: 'Material', type: 'text', placeholder: 'e.g. Leather' },
  dimensions: { label: 'Dimensions', type: 'text', aliases: ['size'], placeholder: 'e.g. 200 x 90 cm' },
  size: { label: 'Size', type: 'text', placeholder: 'e.g. M / 42' },
  gender: { label: 'Gender', type: 'select', options: ['Men', 'Women', 'Unisex', 'Kids'] },
  age_group: { label: 'Age group', type: 'select', options: ['Adult', 'Kids', 'Baby'] },
  quantity: { label: 'Quantity', type: 'number', placeholder: 'e.g. 10' },

  // services
  service_type: { label: 'Service type', type: 'text', placeholder: 'e.g. Home cleaning' },
  availability: { label: 'Availability', type: 'select', options: ['Full-time', 'Part-time', 'On-demand', 'Weekends'] },
  experience_years: { label: 'Experience', type: 'number', unit: 'yrs', aliases: ['experience'] },
} as const satisfies Record<string, AttrFieldDef>

type FieldKey = keyof typeof FIELDS
const FIELD_ORDER = Object.keys(FIELDS) as FieldKey[]

// ---- Which fields each category shows -------------------------------------
// A selected category uses its own entry, else falls back to its parent's.
const CATEGORY_FIELD_KEYS: Record<string, readonly FieldKey[]> = {
  // vehicles
  vehicles: ['make', 'model', 'year', 'mileage_km', 'transmission', 'fuel_type', 'body_type', 'regional_specs', 'exterior_color', 'warranty'],
  cars: ['make', 'model', 'trim', 'year', 'mileage_km', 'transmission', 'fuel_type', 'body_type', 'drivetrain', 'doors', 'seats', 'engine_cc', 'regional_specs', 'exterior_color', 'warranty'],
  motorcycles: ['make', 'model', 'year', 'mileage_km', 'engine_cc', 'fuel_type', 'exterior_color'],
  'heavy-vehicles': ['make', 'model', 'year', 'mileage_km', 'transmission', 'fuel_type', 'regional_specs'],
  boats: ['make', 'model', 'year', 'length_ft', 'engine_cc'],
  'auto-parts': ['part_type', 'compatible_with', 'make'],

  // property
  property: ['bedrooms', 'bathrooms', 'size_sqft', 'furnishing', 'parking', 'floor'],
  'apartments-rent': ['bedrooms', 'bathrooms', 'size_sqft', 'furnishing', 'parking', 'floor', 'rent_period'],
  'apartments-sale': ['bedrooms', 'bathrooms', 'size_sqft', 'furnishing', 'parking', 'floor', 'completion'],
  'villas-rent': ['bedrooms', 'bathrooms', 'size_sqft', 'furnishing', 'parking', 'rent_period'],
  'villas-sale': ['bedrooms', 'bathrooms', 'size_sqft', 'furnishing', 'parking', 'completion'],
  commercial: ['size_sqft', 'furnishing', 'parking', 'floor', 'rent_period'],
  rooms: ['bathrooms', 'furnishing', 'rent_period'],

  // electronics
  electronics: ['brand', 'model', 'color'],
  computers: ['brand', 'model', 'processor', 'ram', 'storage_gb', 'storage_type', 'screen_size_in'],
  'tv-audio': ['brand', 'model', 'screen_size_in', 'resolution'],
  gaming: ['brand', 'model', 'storage_gb'],
  cameras: ['brand', 'model', 'megapixels'],

  // mobiles (leaf parent)
  mobiles: ['brand', 'model', 'storage', 'ram', 'color', 'battery_health', 'network', 'dual_sim'],

  // home & garden
  'home-garden': ['type', 'brand', 'material', 'color', 'dimensions'],
  furniture: ['type', 'material', 'color', 'dimensions'],
  appliances: ['brand', 'type', 'warranty'],
  'home-decor': ['type', 'material', 'color'],
  garden: ['type', 'material'],

  // leaf parents
  fashion: ['brand', 'size', 'gender', 'material', 'color'],
  services: ['service_type', 'availability', 'experience_years'],
  hobbies: ['type', 'brand', 'age_group'],
  business: ['type', 'brand', 'quantity'],
}

const withKey = (key: FieldKey): AttrField => ({ key, ...FIELDS[key] })

/**
 * The ordered attribute fields for a category. Uses the category's own field set
 * when defined, otherwise its parent's (so "Cars" inherits nothing extra but a
 * hypothetical un-configured vehicle subcategory falls back to "vehicles").
 */
export function resolveAttributeFields(
  slug: string | null | undefined,
  parentSlug?: string | null,
): AttrField[] {
  const keys =
    (slug && CATEGORY_FIELD_KEYS[slug]) ||
    (parentSlug && CATEGORY_FIELD_KEYS[parentSlug]) ||
    []
  return keys.map(withKey)
}

// ---- Coercion / validation -------------------------------------------------
function coerceOne(field: AttrField, raw: unknown): string | null {
  if (raw == null) return null
  const v = String(raw).trim()
  if (!v) return null
  if (field.type === 'select') {
    const opt = field.options?.find((o) => o.toLowerCase() === v.toLowerCase())
    if (opt) return opt
    // tolerate "5 doors" / "Automatic transmission" — first option contained in v
    const loose = field.options?.find((o) => v.toLowerCase().includes(o.toLowerCase()))
    return loose ?? null
  }
  if (field.type === 'number') {
    // Pull the first number out of e.g. "45,000 km"; a leading "-" makes it negative.
    const m = v.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
    if (!m) return null
    const n = Number(m[0])
    if (!Number.isFinite(n) || n < 0) return null
    return String(n % 1 === 0 ? Math.round(n) : n)
  }
  return v.slice(0, field.maxLen ?? 60)
}

/**
 * Whitelist + coerce a raw attributes map against a category's fields.
 * Unknown keys are dropped; empty/invalid values are omitted. Never throws.
 */
export function sanitizeAttributes(
  fields: AttrField[],
  raw: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const f of fields) {
    const coerced = coerceOne(f, (raw as Record<string, unknown>)[f.key])
    if (coerced != null) out[f.key] = coerced
  }
  return out
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Map AI-detected attributes (free-form name/value pairs, plus optional brand /
 * colour) onto a category's fields, matching by label/key/aliases. Returns only
 * the fields that matched with a valid coerced value.
 */
export function matchAiAttributes(
  fields: AttrField[],
  detected: { name: string; value: string }[],
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of fields) {
    const names = new Set([f.label, f.key, ...(f.aliases ?? [])].map(norm))
    const hit = detected.find((d) => d.name && names.has(norm(d.name)))
    if (!hit) continue
    const coerced = coerceOne(f, hit.value)
    if (coerced != null) out[f.key] = coerced
  }
  return out
}

/** Ordered, labelled specs for display. Skips unknown/blank keys. */
export function formatAttributesForDisplay(
  attributes: Record<string, unknown> | null | undefined,
): { key: string; label: string; value: string }[] {
  if (!attributes || typeof attributes !== 'object') return []
  const out: { key: string; label: string; value: string }[] = []
  for (const key of FIELD_ORDER) {
    const raw = (attributes as Record<string, unknown>)[key]
    if (raw == null || String(raw).trim() === '') continue
    const f: AttrFieldDef = FIELDS[key]
    const val = String(raw).trim()
    out.push({ key, label: f.label, value: f.unit ? `${val} ${f.unit}` : val })
  }
  return out
}

/** Distinct field labels — a hint list for the AI prompt. */
export function attributeVocabulary(): string[] {
  return [...new Set(FIELD_ORDER.map((k) => FIELDS[k].label))]
}
