import { useState, useCallback } from 'react';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import { encrypt, decrypt } from '@renderer/lib/crypto';
import type { VaultEntry } from '@renderer/types';

export function useVault() {
  const { jwt, cryptoKeyRef } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVault = useCallback(async () => {
    if (!jwt || !cryptoKeyRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const { encryptedData, iv } = await api.getVault(jwt);
      const plaintext = await decrypt(cryptoKeyRef.current, encryptedData, iv);
      setEntries(JSON.parse(plaintext) as VaultEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  }, [jwt, cryptoKeyRef]);

  const saveEntries = useCallback(
    async (next: VaultEntry[]) => {
      if (!jwt || !cryptoKeyRef.current) {
        throw new Error('Not authenticated — vault save aborted');
      }
      const { encryptedData, iv } = await encrypt(cryptoKeyRef.current, JSON.stringify(next));
      await api.putVault({ encryptedData, iv }, jwt);
    },
    [jwt, cryptoKeyRef],
  );

  const addEntry = useCallback(
    async (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const prev = entries;
      const newEntry: VaultEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [...prev, newEntry];
      setEntries(next);
      try {
        await saveEntries(next);
      } catch (e) {
        setEntries(prev);
        throw e;
      }
    },
    [entries, saveEntries],
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const prev = entries;
      const next = prev.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
      );
      setEntries(next);
      try {
        await saveEntries(next);
      } catch (e) {
        setEntries(prev);
        throw e;
      }
    },
    [entries, saveEntries],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const prev = entries;
      const next = prev.filter((e) => e.id !== id);
      setEntries(next);
      try {
        await saveEntries(next);
      } catch (e) {
        setEntries(prev);
        throw e;
      }
    },
    [entries, saveEntries],
  );

  return { entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry };
}
