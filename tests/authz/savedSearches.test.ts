/**
 * Authorization tests for the saved-searches repository (lib/db/savedSearches).
 * Proves owner scoping: user B cannot read, delete, rename, or re-flag user A's
 * saved searches.
 */
import {
  savedSearchesFor,
  createSavedSearchFor,
  deleteSavedSearchFor,
  renameSavedSearchFor,
  setSavedSearchNotifyFor,
} from '@/lib/db/savedSearches'
import { ok, summary, exitCode, resetDb, makeUser, disconnect } from '@/tests/authz/_harness'

async function main() {
  await resetDb()
  const alice = await makeUser({ email: 'alice@test.ae' })
  const bob = await makeUser({ email: 'bob@test.ae' })

  await createSavedSearchFor(alice.viewer, {
    label: 'Cheap cars',
    queryText: 'toyota',
    parsedFilters: { emirate: 'dubai' },
    notify: false,
  })
  const aliceList = await savedSearchesFor(alice.viewer)
  ok('owner sees their saved search', aliceList.length === 1 && aliceList[0].label === 'Cheap cars')
  ok('DTO maps snake_case + filters', aliceList[0].query_text === 'toyota' && aliceList[0].parsed_filters.emirate === 'dubai')
  const id = aliceList[0].id

  // --- DENY: Bob cannot see it ---
  ok('DENY: Bob sees no saved searches', (await savedSearchesFor(bob.viewer)).length === 0)

  // --- DENY: Bob cannot mutate Alice's search ---
  ok('DENY: Bob delete affects 0 rows', (await deleteSavedSearchFor(bob.viewer, id)) === false)
  ok('DENY: Bob rename affects 0 rows', (await renameSavedSearchFor(bob.viewer, id, 'hacked')) === false)
  ok('DENY: Bob setNotify affects 0 rows', (await setSavedSearchNotifyFor(bob.viewer, id, true)) === false)
  const afterAttacks = await savedSearchesFor(alice.viewer)
  ok('Alice search intact after Bob attempts', afterAttacks[0].label === 'Cheap cars' && afterAttacks[0].notify === false)

  // --- ALLOW: owner can mutate ---
  ok('owner rename works', (await renameSavedSearchFor(alice.viewer, id, 'Toyotas')) === true)
  ok('owner setNotify works', (await setSavedSearchNotifyFor(alice.viewer, id, true)) === true)
  const updated = await savedSearchesFor(alice.viewer)
  ok('owner mutations applied', updated[0].label === 'Toyotas' && updated[0].notify === true)
  ok('owner delete works', (await deleteSavedSearchFor(alice.viewer, id)) === true)
  ok('list empty after delete', (await savedSearchesFor(alice.viewer)).length === 0)

  summary('savedSearches')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
