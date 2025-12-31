// A simple key-value store using IndexedDB
// Based on the 'idb-keyval' library by Jake Archibald

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function createStore(
  dbName: string,
  storeName: string,
): (txMode: IDBTransactionMode, callback: (store: IDBObjectStore) => void) => Promise<void> {
  const request = indexedDB.open(dbName, 1)
  request.onupgradeneeded = () => request.result.createObjectStore(storeName)
  const dbp = promisifyRequest(request)

  return (txMode, callback) =>
    dbp.then((db) => {
      const tx = db.transaction(storeName, txMode)
      callback(tx.objectStore(storeName))
      return promisifyRequest(tx as unknown as IDBRequest<void>)
    })
}

let defaultGetStore: ReturnType<typeof createStore>
function getStore() {
  if (!defaultGetStore) {
    defaultGetStore = createStore("animesync-db", "keyval")
  }
  return defaultGetStore
}

export function get<T>(key: IDBValidKey): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve, reject) => {
    const request = indexedDB.open("animesync-db", 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore("keyval")
    }

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction("keyval", "readonly")
      const store = transaction.objectStore("keyval")
      const getRequest = store.get(key)

      getRequest.onsuccess = () => {
        resolve(getRequest.result as T | undefined)
      }

      getRequest.onerror = () => {
        reject(getRequest.error)
      }
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export function set(key: IDBValidKey, value: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("animesync-db", 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore("keyval")
    }

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction("keyval", "readwrite")
      const store = transaction.objectStore("keyval")

      const putRequest = store.put(value, key)

      putRequest.onsuccess = () => {
        transaction.oncomplete = () => {
          resolve()
        }
      }

      putRequest.onerror = () => {
        reject(putRequest.error)
      }

      transaction.onerror = () => {
        reject(transaction.error)
      }
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export function del(key: IDBValidKey): Promise<void> {
  return getStore()("readwrite", (store) => {
    store.delete(key)
  })
}

export function clear(): Promise<void> {
  return getStore()("readwrite", (store) => {
    store.clear()
  })
}

export function keys(): Promise<IDBValidKey[]> {
  const keys: IDBValidKey[] = []
  return getStore()("readonly", (store) => {
    // This would be more efficient with openKeyCursor, but this is fine for now
    ;(store.openCursor || store.openKeyCursor).call(store).onsuccess = function () {
      if (!this.result) return
      keys.push(this.result.key)
      this.result.continue()
    }
  }).then(() => keys)
}
