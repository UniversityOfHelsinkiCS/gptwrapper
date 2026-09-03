class SafeStorage {
  private get storage(): Storage | undefined {
    try {
      return globalThis.localStorage ?? undefined
    } catch {
      return undefined
    }
  }

  public getItem(key: string) {
    return this.run((s) => s.getItem(key))
  }

  public setItem(key: string, value: string) {
    return this.run((s) => s.setItem(key, value))
  }

  public removeItem(key: string) {
    return this.run((s) => s.removeItem(key))
  }

  private run<T>(action: (storage: Storage) => T): T | null {
    const s = this.storage
    if (!s) return null
    try {
      return action(s)
    } catch {
      return null
    }
  }
}

const safeLocalStorage = new SafeStorage()

export default safeLocalStorage
