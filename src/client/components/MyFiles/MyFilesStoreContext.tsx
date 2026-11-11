import { createContext, useContext, type ReactNode } from 'react'
import { getMyFilesStore } from '../../util/myFiles/opfsStore'
import type { MyFilesStore } from '../../util/myFiles/store'

const MyFilesStoreContext = createContext<MyFilesStore | null | undefined>(undefined)

/** Overrides the store, e.g. with `createMemoryStore()` in tests. */
export const MyFilesStoreProvider = ({ store, children }: { store: MyFilesStore | null; children: ReactNode }) => (
  <MyFilesStoreContext.Provider value={store}>{children}</MyFilesStoreContext.Provider>
)

/** The My files store: the provided one, else the browser's OPFS store, or null when the browser has no OPFS. */
export const useMyFilesStore = (): MyFilesStore | null => {
  const provided = useContext(MyFilesStoreContext)
  return provided === undefined ? getMyFilesStore() : provided
}
