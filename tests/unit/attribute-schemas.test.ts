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

summary('attribute-schemas')
process.exit(exitCode())
