import { useState, useCallback } from 'react';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import type { VaultEntry, CreateVaultEntryRequest, UpdateVaultEntryRequest } from '@renderer/types';

export function useVault() {
  const { jwt } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVault = useCallback(async () => {
    if (!jwt) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVaultEntries(jwt);
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  }, [jwt]);

  const addEntry = useCallback(
    async (entry: CreateVaultEntryRequest) => {
      if (!jwt) throw new Error('Not authenticated');
      const newEntry = await api.createVaultEntry(entry, jwt);
      setEntries((prev) => [...prev, newEntry]);
      return newEntry;
    },
    [jwt],
  );

  const updateEntry = useCallback(
    async (id: string, patch: UpdateVaultEntryRequest) => {
      if (!jwt) throw new Error('Not authenticated');
      const prev = entries;
      setEntries((current) =>
        current.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)),
      );
      try {
        const updated = await api.updateVaultEntry(id, patch, jwt);
        setEntries((current) => current.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (e) {
        setEntries(prev);
        throw e;
      }
    },
    [jwt, entries],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!jwt) throw new Error('Not authenticated');
      const prev = entries;
      setEntries((current) => current.filter((e) => e.id !== id));
      try {
        await api.deleteVaultEntry(id, jwt);
      } catch (e) {
        setEntries(prev);
        throw e;
      }
    },
    [jwt, entries],
  );

  return { entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry };
}
