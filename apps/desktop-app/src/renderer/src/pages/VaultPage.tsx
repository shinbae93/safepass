import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/context/AuthContext'
import { useVault } from '@renderer/hooks/useVault'
import type { VaultEntry } from '@renderer/types'

export default function VaultPage() {
  const { lock } = useAuth()
  const { entries, loading, error, loadVault, addEntry, deleteEntry } = useVault()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadVault()
  }, [loadVault])

  const [mutationError, setMutationError] = useState<string | null>(null)

  async function handleAdd() {
    if (!title || !value) return
    setMutationError(null)
    try {
      await addEntry({ title, value, notes: notes || null, categoryId: null })
      setTitle('')
      setValue('')
      setNotes('')
      setShowAdd(false)
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to save entry')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold">SafePass</h1>
        <button
          onClick={lock}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
        >
          Lock
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {(error || mutationError) && (
          <p className="mb-4 text-sm text-red-400">{mutationError ?? error}</p>
        )}

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            {showAdd ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>

        {showAdd && (
          <div className="mb-6 space-y-3 rounded-xl bg-gray-900 p-6">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Secret / Password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              className="w-full rounded-lg bg-blue-600 py-2 font-semibold hover:bg-blue-700"
            >
              Save Entry
            </button>
          </div>
        )}

        {loading && <p className="text-gray-400">Loading vault…</p>}

        <ul className="space-y-3">
          {entries.map((entry: VaultEntry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-xl bg-gray-900 px-6 py-4"
            >
              <div>
                <p className="font-semibold">{entry.title}</p>
                {entry.notes && <p className="text-sm text-gray-400">{entry.notes}</p>}
              </div>
              <button
                onClick={() => deleteEntry(entry.id).catch((e) => setMutationError(e instanceof Error ? e.message : 'Failed to delete entry'))}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
