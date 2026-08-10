/** Unit tests for lib/listings/attributeSchemas — category facets. No DB. */
import {
  resolveAttributeFields,
  resolveAttributeFieldsForSlug,
  sanitizeAttributes,
  matchAiAttributes,
  formatAttributesForDisplay,
  attributeVocabulary,
  parseAttributeFilters,
  describeAttributeParam,
  filterableFields,
  cardFacets,
  extractAttributesFromText,
} from '@/lib/listings/attributeSchemas'
import { ok, eq, summary, exitCode } from '@/tests/unit/_harness'

// --- resolveAttributeFields -------------------------------------------------
const carFields = resolveAttributeFields('cars', 'vehicles')
const carKeys = carFields.map((f) => f.key)
ok('cars include mileage', carKeys.includes('mileage_km'))
ok('cars include transmission', carKeys.includes('transmission'))
ok('cars include doors', carKeys.includes('doors'))
ok('mobiles include storage', resolveAttributeFields('mobiles', null).some((f) => f.key === 'storage'))
ok('apartments include bedrooms', resolveAttributeFields('apartments-rent', 'property').some((f) => f.key === 'bedrooms'))
// falls back to parent when the subcategory has no own schema
ok('unknown vehicle subcat falls back to vehicles', resolveAttributeFields('quad-bikes', 'vehicles').some((f) => f.key === 'make'))
eq('unknown category with no parent → no fields', resolveAttributeFields('nope', null).length, 0)

// --- sanitizeAttributes -----------------------------------------------------
const clean = sanitizeAttributes(carFields, {
  mileage_km: '45,000 km', // number: strips non-digits
  transmission: 'automatic', // select: case-insensitive match → canonical
  doors: '4 doors', // select: loose contains match
  make: '  Toyota  ', // text: trimmed
  fuel_type: 'plasma', // select: invalid → dropped
  bedrooms: '3', // not a car field → dropped (whitelist)
  seats: '-2', // number: negative → dropped
})
eq('mileage coerced to digits', clean.mileage_km, '45000')
eq('transmission canonicalised', clean.transmission, 'Automatic')
eq('doors loose-matched', clean.doors, '4')
eq('make trimmed', clean.make, 'Toyota')
ok('invalid select dropped', !('fuel_type' in clean))
ok('foreign key dropped (whitelist)', !('bedrooms' in clean))
ok('negative number dropped', !('seats' in clean))

// --- matchAiAttributes ------------------------------------------------------
const matched = matchAiAttributes(carFields, [
  { name: 'Mileage', value: '30000' },
  { name: 'Kilometers', value: '99999' }, // alias, but mileage already set → ignored
  { name: 'Transmission', value: 'Manual' },
  { name: 'brand', value: 'Nissan' }, // maps to `make` (alias)
  { name: 'color', value: 'Red' }, // maps to `exterior_color` (alias)
  { name: 'Warp core', value: 'installed' }, // no field → ignored
])
eq('AI mileage matched', matched.mileage_km, '30000')
eq('AI transmission matched', matched.transmission, 'Manual')
eq('AI brand → make via alias', matched.make, 'Nissan')
eq('AI color → exterior_color via alias', matched.exterior_color, 'Red')
ok('unmatched AI facet ignored', !('warp_core' in matched))

// --- formatAttributesForDisplay --------------------------------------------
const specs = formatAttributesForDisplay({ mileage_km: '45000', transmission: 'Automatic', junk: 'x' })
const byLabel = Object.fromEntries(specs.map((s) => [s.label, s.value]))
eq('mileage shown with unit', byLabel['Mileage'], '45000 km')
eq('transmission shown plain', byLabel['Transmission'], 'Automatic')
ok('unknown key not displayed', !specs.some((s) => s.value === 'x'))
// display order follows the catalogue (mileage before transmission)
ok('display order is catalogue order', specs.findIndex((s) => s.label === 'Mileage') < specs.findIndex((s) => s.label === 'Transmission'))

// --- vocabulary -------------------------------------------------------------
ok('vocabulary is non-empty and unique', attributeVocabulary().length > 10 && new Set(attributeVocabulary()).size === attributeVocabulary().length)

// --- resolveAttributeFieldsForSlug (via category list) ----------------------
const cats = [
  { id: 'v', slug: 'vehicles', parent_id: null },
  { id: 'c', slug: 'cars', parent_id: 'v' },
  { id: 'm', slug: 'mobiles', parent_id: null },
]
ok('slug resolver: cars via parent list has mileage', resolveAttributeFieldsForSlug('cars', cats).some((f) => f.key === 'mileage_km'))
ok('slug resolver: mobiles has storage', resolveAttributeFieldsForSlug('mobiles', cats).some((f) => f.key === 'storage'))
eq('slug resolver: null slug → none', resolveAttributeFieldsForSlug(null, cats).length, 0)

// --- filterableFields -------------------------------------------------------
const split = filterableFields(carFields)
ok('transmission is a select filter', split.selects.some((f) => f.key === 'transmission'))
ok('mileage is a number filter', split.numbers.some((f) => f.key === 'mileage_km'))
ok('no number field appears in selects', !split.selects.some((f) => f.type !== 'select'))

// --- parseAttributeFilters --------------------------------------------------
const filters = parseAttributeFilters(carFields, {
  a_transmission: 'Automatic', // select eq
  a_fuel_type: 'plasma', // invalid option → dropped
  a_mileage_km_max: '80,000', // number max (comma stripped)
  a_year_min: '2018', // number min
  a_bedrooms: '3', // not a car field → dropped (whitelist)
  a_seats_max: '-4', // negative → dropped
})
const find = (key: string, op: string) => filters.find((f) => f.key === key && f.op === op)
eq('transmission eq parsed', find('transmission', 'eq')?.value, 'Automatic')
eq('mileage max parsed (comma stripped)', find('mileage_km', 'max')?.value, '80000')
eq('year min parsed', find('year', 'min')?.value, '2018')
ok('invalid select option dropped', !find('fuel_type', 'eq'))
ok('foreign attr key dropped', !filters.some((f) => f.key === 'bedrooms'))
ok('negative number dropped', !find('seats', 'max'))

// --- describeAttributeParam -------------------------------------------------
eq('describe select', describeAttributeParam('a_transmission', 'Automatic')?.label, 'Transmission: Automatic')
eq('describe max with unit', describeAttributeParam('a_mileage_km_max', '80000')?.label, 'Mileage ≤ 80000 km')
eq('describe min', describeAttributeParam('a_year_min', '2018')?.label, 'Year ≥ 2018')
eq('describe unknown key → null', describeAttributeParam('a_nope', 'x'), null)
eq('describe non-attr param → null', describeAttributeParam('emirate', 'dubai'), null)

// --- cardFacets -------------------------------------------------------------
// Curated order for the category, identity fields (make/model) omitted, values formatted.
const carCard = cardFacets('cars', {
  make: 'Toyota', // identity → skipped (already in title)
  model: 'Corolla', // identity → skipped
  year: '2021',
  mileage_km: '45000', // number → grouped + unit
  transmission: 'Automatic',
  fuel_type: 'Petrol', // beyond max(3) for cars' curated set
})
eq('car card facet count capped at 3', carCard.length, 3)
eq('car facet order/format #1', carCard[0].value, '2021')
eq('car facet mileage grouped + unit', carCard[1].value, '45,000 km')
eq('car facet transmission', carCard[2].value, 'Automatic')
ok('car card omits identity fields', !carCard.some((f) => f.key === 'make' || f.key === 'model'))

// Count fields get a short suffix; "Studio" stays as-is.
const propCard = cardFacets('apartments-rent', { bedrooms: '3', bathrooms: '2', size_sqft: '1200' })
eq('bedrooms suffixed', propCard[0].value, '3 Bed')
eq('bathrooms suffixed', propCard[1].value, '2 Bath')
eq('size grouped + unit', propCard[2].value, '1,200 sq ft')
eq('studio not suffixed', cardFacets('apartments-sale', { bedrooms: 'Studio' })[0].value, 'Studio')

// Unknown category → falls back to catalogue order, still skipping identity fields.
const fallback = cardFacets('mystery-category', { brand: 'Sony', storage: '256GB', ram: '8GB' })
ok('fallback skips brand identity', !fallback.some((f) => f.key === 'brand'))
ok('fallback surfaces storage', fallback.some((f) => f.value === '256GB'))
eq('no attributes → empty', cardFacets('cars', {}).length, 0)
eq('null attributes → empty', cardFacets('cars', null).length, 0)
eq('respects custom max', cardFacets('cars', { year: '2021', mileage_km: '10000', transmission: 'Manual' }, 2).length, 2)

// --- extractAttributesFromText ---------------------------------------------
// Laptop title — the real prod case. RAM vs storage must not be confused.
const lap = extractAttributesFromText(
  resolveAttributeFields('computers', 'electronics'),
  'Lenovo Thinkpad T14 Intel core i7 16gb Ram 512gb NVME ssd 14 inches FHD',
)
eq('laptop RAM extracted (select)', lap.ram, '16GB')
eq('laptop storage extracted (not RAM 16)', lap.storage_gb, '512')
eq('laptop screen size extracted', lap.screen_size_in, '14')

// TB storage → normalised to GB.
eq(
  'storage in TB → GB',
  extractAttributesFromText(resolveAttributeFields('computers', 'electronics'), '1TB SSD gaming laptop').storage_gb,
  '1000',
)

// Car text — year/mileage/transmission/specs, all scoped to the cars schema.
const car = extractAttributesFromText(
  resolveAttributeFields('cars', 'vehicles'),
  'Nissan Patrol 2021, 45,000 km, Automatic, GCC specs, full service history',
)
eq('car year', car.year, '2021')
eq('car mileage (comma stripped)', car.mileage_km, '45000')
eq('car transmission', car.transmission, 'Automatic')
eq('car regional specs', car.regional_specs, 'GCC')

// Property text — anchored bed/bath + size + furnishing.
const flat = extractAttributesFromText(
  resolveAttributeFields('apartments-rent', 'property'),
  'Spacious 2 bedroom 2 bathroom apartment, 1,200 sqft, fully Furnished',
)
eq('flat bedrooms', flat.bedrooms, '2')
eq('flat bathrooms', flat.bathrooms, '2')
eq('flat size', flat.size_sqft, '1200')
eq('flat furnishing', flat.furnishing, 'Furnished')

// Phone text — select storage + network.
const phone = extractAttributesFromText(
  resolveAttributeFields('mobiles', null),
  'Apple iPhone 13 128GB, 5G, great condition',
)
eq('phone storage', phone.storage, '128GB')
eq('phone network', phone.network, '5G')

// Scoping + no-false-positives.
ok('car text yields no storage (out of schema)', !('storage_gb' in car))
ok('bare number is not a bedroom count', !('bedrooms' in extractAttributesFromText(resolveAttributeFields('apartments-rent', 'property'), 'Great deal, 3 minutes from metro')))
eq('no text → empty', Object.keys(extractAttributesFromText(resolveAttributeFields('cars', 'vehicles'), '')).length, 0)
eq('plain title, no specs → empty', Object.keys(extractAttributesFromText(resolveAttributeFields('cars', 'vehicles'), 'Toyota Camry for sale')).length, 0)

summary('attribute-schemas')
process.exit(exitCode())
