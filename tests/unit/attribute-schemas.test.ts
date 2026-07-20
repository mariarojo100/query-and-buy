/** Unit tests for lib/listings/attributeSchemas — category facets. No DB. */
import {
  resolveAttributeFields,
  sanitizeAttributes,
  matchAiAttributes,
  formatAttributesForDisplay,
  attributeVocabulary,
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

summary('attribute-schemas')
process.exit(exitCode())
