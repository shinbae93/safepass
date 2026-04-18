import { useEffect, useState } from 'react';
import { useAuth } from '@renderer/context/AuthContext';
import { useVault } from '@renderer/hooks/useVault';
import type { VaultEntry } from '@renderer/types';

// Tokyo Night Light — #1A1B26 text | #2F334D muted | #7AA2F7 accent | #F7768E danger
// bg: #F5F5F7  card: #FFFFFF  border: #E5E7EB

type Panel =
  | { mode: 'none' }
  | { mode: 'add' }
  | { mode: 'detail'; entry: VaultEntry }
  | { mode: 'edit'; entry: VaultEntry };

export default function VaultPage() {
  const { lock, username } = useAuth();
  const { entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry } = useVault();

  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<Panel>({ mode: 'none' });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const [addTitle, setAddTitle] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addReveal, setAddReveal] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReveal, setEditReveal] = useState(false);

  useEffect(() => { loadVault(); }, [loadVault]);

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
      setAddTitle(''); setAddValue(''); setAddNotes(''); setAddReveal(false);
      setPanel({ mode: 'none' });
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  function openEdit(entry: VaultEntry) {
    setEditTitle(entry.title); setEditValue(entry.value);
    setEditNotes(entry.notes ?? ''); setEditReveal(false);
    setPanel({ mode: 'edit', entry });
  }

  async function handleUpdate(entry: VaultEntry) {
    setMutationError(null);
    try {
      await updateEntry(entry.id, { title: editTitle.trim(), value: editValue, notes: editNotes.trim() || null });
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
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] text-[#1A1B26]">

      {/* ── Sidebar (dark) ── */}
      <aside className="flex w-56 flex-col bg-[#1A1B26]">
        <div className="px-6 pt-7 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7AA2F7]">SafePass</p>
          <p className="text-[10px] text-white/30">Secure Vault</p>
        </div>

        <nav className="mt-6 flex-1 space-y-0.5 px-3">
          <SidebarItem icon="🔑" label="All Items" active />
        </nav>

        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7AA2F7] text-xs font-bold text-[#1A1B26] uppercase">
              {username ? username[0] : 'U'}
            </div>
            <p className="truncate text-sm font-medium text-white/70">{username ?? 'Vault'}</p>
          </div>
          <button
            onClick={lock}
            className="w-full rounded-lg bg-white/5 py-1.5 text-xs text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
          >
            Lock
          </button>
        </div>
      </aside>

      {/* ── Main (light) ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        <header className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-8 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2F334D]/50">Dashboard Overview</p>
            <h1 className="text-2xl font-bold text-[#1A1B26]">All Items</h1>
          </div>
          <button
            onClick={() => setPanel({ mode: 'add' })}
            className="rounded-lg bg-[#7AA2F7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            + Add New Item
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {(error || mutationError) && (
            <p className="mb-4 text-sm text-[#F7768E]">{mutationError ?? error}</p>
          )}

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search entries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 shadow-sm focus:border-[#7AA2F7] focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
            />
          </div>

          {loading && <p className="text-sm text-[#2F334D]/40">Loading…</p>}

          <div className="space-y-2">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm hover:border-[#7AA2F7]/40 hover:shadow-md transition-all"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7AA2F7]/10 text-lg">
                  🔑
                </div>

                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setPanel({ mode: 'detail', entry })}
                    className="block truncate text-sm font-semibold text-[#1A1B26] hover:text-[#7AA2F7] text-left transition-colors"
                  >
                    {entry.title}
                  </button>
                  <p className="mt-0.5 truncate font-mono text-xs text-[#2F334D]/50">
                    {revealedIds.has(entry.id) ? entry.value : '••••••••'}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[10px] text-[#2F334D]/40">Last modified</p>
                  <p className="text-xs text-[#2F334D]/60">
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <ActionBtn title="Copy" onClick={() => copyValue(entry.value)}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </ActionBtn>
                  <ActionBtn title={revealedIds.has(entry.id) ? 'Hide' : 'Reveal'} onClick={() => toggleReveal(entry.id)}>
                    {revealedIds.has(entry.id) ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </ActionBtn>
                  <ActionBtn title="Edit" onClick={() => openEdit(entry)}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </ActionBtn>
                  <ActionBtn title="Delete" onClick={() => handleDelete(entry.id)} danger>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </ActionBtn>
                </div>
              </div>
            ))}

            {!loading && filtered.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-[#2F334D]/40">No items found.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Detail modal ── */}
      {panel.mode === 'detail' && (
        <Modal onClose={() => setPanel({ mode: 'none' })} title={panel.entry.title}>
          <div className="space-y-4">
            <Field label="Password">
              <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-3 py-2.5">
                <span className="flex-1 font-mono text-sm text-[#1A1B26]">
                  {revealedIds.has(panel.entry.id) ? panel.entry.value : '••••••••'}
                </span>
                <button onClick={() => toggleReveal(panel.entry.id)} className="text-xs text-[#2F334D]/50 hover:text-[#7AA2F7] transition-colors">
                  {revealedIds.has(panel.entry.id) ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => copyValue(panel.entry.value)} className="text-xs text-[#2F334D]/50 hover:text-[#7AA2F7] transition-colors">
                  Copy
                </button>
              </div>
            </Field>
            {panel.entry.notes && (
              <Field label="Notes">
                <p className="rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-3 py-2.5 text-sm text-[#1A1B26]">{panel.entry.notes}</p>
              </Field>
            )}
            <p className="text-xs text-[#2F334D]/40">
              Created {new Date(panel.entry.createdAt).toLocaleString()}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => openEdit(panel.entry)}
                className="flex-1 rounded-lg bg-[#7AA2F7] py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(panel.entry.id)}
                className="rounded-lg border border-[#F7768E]/30 bg-[#F7768E]/8 px-4 py-2.5 text-sm font-medium text-[#F7768E] hover:bg-[#F7768E]/15 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add modal ── */}
      {panel.mode === 'add' && (
        <Modal onClose={() => setPanel({ mode: 'none' })} title="New Item">
          <div className="space-y-3">
            {mutationError && <p className="text-sm text-[#F7768E]">{mutationError}</p>}
            <LightInput placeholder="Title" value={addTitle} onChange={setAddTitle} />
            <LightPasswordInput
              placeholder="Secret / Password"
              value={addValue}
              onChange={setAddValue}
              reveal={addReveal}
              onToggleReveal={() => setAddReveal((v) => !v)}
            />
            <LightInput placeholder="Notes (optional)" value={addNotes} onChange={setAddNotes} />
            <div className="flex gap-3 pt-1">
              <button onClick={handleAdd} className="flex-1 rounded-lg bg-[#7AA2F7] py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity">
                Save
              </button>
              <button onClick={() => setPanel({ mode: 'none' })} className="rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm text-[#2F334D]/60 hover:bg-[#F5F5F7] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {panel.mode === 'edit' && (
        <Modal onClose={() => setPanel({ mode: 'none' })} title="Edit Item">
          <div className="space-y-3">
            {mutationError && <p className="text-sm text-[#F7768E]">{mutationError}</p>}
            <LightInput placeholder="Title" value={editTitle} onChange={setEditTitle} />
            <LightPasswordInput
              placeholder="Secret / Password"
              value={editValue}
              onChange={setEditValue}
              reveal={editReveal}
              onToggleReveal={() => setEditReveal((v) => !v)}
            />
            <LightInput placeholder="Notes (optional)" value={editNotes} onChange={setEditNotes} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => handleUpdate(panel.entry)} className="flex-1 rounded-lg bg-[#7AA2F7] py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity">
                Save
              </button>
              <button onClick={() => setPanel({ mode: 'detail', entry: panel.entry })} className="rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm text-[#2F334D]/60 hover:bg-[#F5F5F7] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-default transition-colors ${active ? 'bg-[#7AA2F7]/15 text-[#7AA2F7]' : 'text-white/40 hover:bg-white/5 hover:text-white/70'}`}>
      <span className="text-base">{icon}</span>
      {label}
    </div>
  );
}

function ActionBtn({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg p-2 transition-colors ${danger ? 'text-[#F7768E]/50 hover:bg-[#F7768E]/8 hover:text-[#F7768E]' : 'text-[#2F334D]/40 hover:bg-[#F5F5F7] hover:text-[#2F334D]'}`}
    >
      {children}
    </button>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1B26]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1B26]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#2F334D]/40 hover:bg-[#F5F5F7] hover:text-[#2F334D] transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#2F334D]/50">{label}</p>
      {children}
    </div>
  );
}

function LightInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
    />
  );
}

function LightPasswordInput({ placeholder, value, onChange, reveal, onToggleReveal }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  reveal: boolean; onToggleReveal: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={reveal ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#E5E7EB] bg-[#F5F5F7] px-4 py-2.5 pr-16 text-sm text-[#1A1B26] placeholder-[#2F334D]/30 focus:border-[#7AA2F7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7AA2F7] transition-colors"
      />
      <button
        type="button"
        onClick={onToggleReveal}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#2F334D]/40 hover:text-[#7AA2F7] transition-colors"
      >
        {reveal ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
