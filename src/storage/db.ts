import { normalizeSavedLoop } from '../loops/normalize'
import type { DawProject, SavedLoop, WorkingSession } from '../loops/types'

const DB_NAME = 'howling-whispers-analog'
const DB_VERSION = 1
const LOOP_STORE = 'loops'
const STATE_STORE = 'state'

let databasePromise: Promise<IDBDatabase> | undefined

export async function saveLoop(loop: SavedLoop): Promise<void> {
  await put(LOOP_STORE, loop)
}

export async function listLoops(): Promise<SavedLoop[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(LOOP_STORE, 'readonly').objectStore(LOOP_STORE).getAll()
    request.onsuccess = () => {
      const loops = (request.result as unknown[])
        .map(normalizeSavedLoop)
        .filter((loop): loop is SavedLoop => Boolean(loop))
        .sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(loops)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not read saved loops'))
  })
}

export async function deleteLoop(id: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(LOOP_STORE, 'readwrite').objectStore(LOOP_STORE).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not delete loop'))
  })
}

export async function saveWorkingSession(session: WorkingSession): Promise<void> {
  await put(STATE_STORE, session)
}

export async function loadWorkingSession(): Promise<unknown> {
  return get<unknown>(STATE_STORE, 'working-session')
}

export async function saveDawProject(project: DawProject): Promise<void> {
  await put(STATE_STORE, project)
}

export async function loadDawProject(): Promise<DawProject | undefined> {
  return get<DawProject>(STATE_STORE, 'default-project')
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

async function put(storeName: string, value: object): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error(`Could not write ${storeName}`))
  })
}

async function get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error ?? new Error(`Could not read ${storeName}`))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LOOP_STORE)) db.createObjectStore(LOOP_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE, { keyPath: 'id' })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open Analog local database'))
  })

  return databasePromise
}
