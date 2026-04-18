import { useEffect, useState } from 'react';
import { useAuth } from '@renderer/context/AuthContext';
import { useVault } from '@renderer/hooks/useVault';
import type { VaultEntry } from '@renderer/types';

type Panel =
  | { mode: 'none' }
  | { mode: 'add' }
  | { mode: 'detail'; entry: VaultEntry }
  | { mode: 'edit'; entry: VaultEntry };

export default function VaultPage() {
  const { lock } = useAuth();
  const { entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry } = useVault();

  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<Panel>({ mode: 'none' });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Add form state
  const [addTitle, setAddTitle] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReveal, setEditReveal] = useState(false);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
  }

  async function handleAdd() {
    if (!addTitle.trim() || !addValue.trim()) return;
    setMutationError(null);
    try {
      await addEntry({ title: addTitle.trim(), value: addValue, notes: addNotes.trim() || undefined });
      setAddTitle('');
      setAddValue('');
      setAddNotes('');
      setPanel({ mode: 'none' });
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  function openEdit(entry: VaultEntry) {
    setEditTitle(entry.title);
    setEditValue(entry.value);
    setEditNotes(entry.notes ?? '');
    setEditReveal(false);
    setPanel({ mode: 'edit', entry });
  }

  async function handleUpdate(entry: VaultEntry) {
    setMutationError(null);
    try {
      await updateEntry(entry.id, {
        title: editTitle.trim(),
        value: editValue,
        notes: editNotes.trim() || null,
      });
      setPanel({ mode: 'none' });
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  async function handleDelete(id: string) {
    setMutationError(null);
    try {
      await deleteEntry(id);
      setPanel({ mode: 'none' });
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold">SafePass</h1>
        <button
          onClick={lock}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
        >
          Lock
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {(error || mutationError) && (
          <p className="mb-4 text-sm text-red-400">{mutationError ?? error}</p>
        )}

        {/* Toolbar */}
        <div className="mb-6 flex gap-3">
          <input
            type="text"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setPanel({ mode: 'add' })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            + Add
          </button>
        </div>

        {/* Add form */}
        {panel.mode === 'add' && (
          <div className="mb-6 space-y-3 rounded-xl bg-gray-900 p-6">
            <h2 className="font-semibold">New Entry</h2>
            <input
              type="text"
              placeholder="Title"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Secret / Password"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setPanel({ mode: 'none' })}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entry list */}
        {loading && <p className="text-gray-400">Loading vault…</p>}

        <ul className="space-y-2">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl bg-gray-900 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setPanel({ mode: 'detail', entry })}
                    className="truncate font-semibold hover:underline text-left"
                  >
                    {entry.title}
                  </button>
                  {entry.notes && (
                    <p className="mt-0.5 truncate text-sm text-gray-400">{entry.notes}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="font-mono text-gray-400">
                      {revealedIds.has(entry.id) ? entry.value : '••••••••'}
                    </span>
                    <button
                      onClick={() => toggleReveal(entry.id)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      {revealedIds.has(entry.id) ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => copyValue(entry.value)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Detail panel */}
        {panel.mode === 'detail' && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{panel.entry.title}</h2>
                <button
                  onClick={() => setPanel({ mode: 'none' })}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Value</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {revealedIds.has(panel.entry.id) ? panel.entry.value : '••••••••'}
                  </span>
                  <button
                    onClick={() => toggleReveal(panel.entry.id)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    {revealedIds.has(panel.entry.id) ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => copyValue(panel.entry.value)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Copy
                  </button>
                </div>
              </div>
              {panel.entry.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm">{panel.entry.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">
                  Created {new Date(panel.entry.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => openEdit(panel.entry)}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(panel.entry.id)}
                  className="rounded-lg bg-red-600/20 px-4 py-2 text-sm text-red-400 hover:bg-red-600/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit panel */}
        {panel.mode === 'edit' && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Edit Entry</h2>
                <button
                  onClick={() => setPanel({ mode: 'none' })}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {mutationError && (
                <p className="text-sm text-red-400">{mutationError}</p>
              )}
              <input
                type="text"
                placeholder="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="relative">
                <input
                  type={editReveal ? 'text' : 'password'}
                  placeholder="Secret / Password"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 pr-16 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setEditReveal((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
                >
                  {editReveal ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Notes (optional)"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdate(panel.entry)}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setPanel({ mode: 'detail', entry: panel.entry })}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
