import { create } from 'zustand';
import { ClientsMap } from '../types';

interface ClientState {
  clients: ClientsMap | null;
  loading: boolean;
  error: Error | null;
  
  setClients: (clients: ClientsMap) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error) => void;
}

export const useClientStore = create<ClientState>()(
    (set) => ({
        clients: null,
        loading: false,
        error: null,
        
        setClients: (clients: ClientsMap) => set({ clients }),
        setLoading: (loading: boolean) => set({ loading }),
        setError: (error: Error) => set({ error }),
    })
);
