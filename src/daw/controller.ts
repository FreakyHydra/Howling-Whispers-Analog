import { DAW_SLOT_COUNT, cloneLoopState, type DawProject, type SavedLoop, type WorkingSession } from '../loops/types'
import type { BeatSequencerController } from '../sequencer/controller'
import {
  deleteLoop,
  listLoops,
  loadDawProject,
  loadWorkingSession,
  requestPersistentStorage,
  saveDawProject,
  saveLoop,
  saveWorkingSession,
} from '../storage/db'

export async function setupDawWorkspace(beat: BeatSequencerController): Promise<void> {
  let loops: SavedLoop[] = []
  let selectedLoopId: string | null = null
  let project: DawProject = await loadDawProject() ?? emptyProject()
  let saveTimer: number | undefined

  const library = required<HTMLElement>('#daw-library')
  const status = required<HTMLElement>('#daw-status')
  const loopName = required<HTMLInputElement>('#loop-name')
  const loopSave = required<HTMLButtonElement>('#loop-save')
  const loopSaveStatus = required<HTMLElement>('#loop-save-status')

  setupWorkspaceTabs()

  const restore = await loadWorkingSession()
  if (restore) {
    beat.sequencer.loadState(restore.state)
    beat.refresh()
    loopSaveStatus.textContent = 'Working session restored from this browser.'
  }

  beat.sequencer.onChange = () => {
    if (saveTimer !== undefined) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      const session: WorkingSession = {
        id: 'working-session',
        state: beat.sequencer.getState(),
        updatedAt: Date.now(),
      }
      void saveWorkingSession(session)
    }, 350)
  }

  const refreshLibrary = async (): Promise<void> => {
    loops = await listLoops()
    if (selectedLoopId && !loops.some((loop) => loop.id === selectedLoopId)) selectedLoopId = null
    renderLibrary(library, loops, selectedLoopId, selectLoop, loadLoop, removeLoop)
    renderArrangement(project, loops)
    status.textContent = loops.length ? 'Select a loop, then place it into the arrangement.' : 'Save a loop in Analog first.'
  }

  const persistProject = async (): Promise<void> => {
    project.updatedAt = Date.now()
    await saveDawProject(project)
  }

  async function selectLoop(id: string): Promise<void> {
    selectedLoopId = id
    renderLibrary(library, loops, selectedLoopId, selectLoop, loadLoop, removeLoop)
    const loop = loops.find((candidate) => candidate.id === id)
    status.textContent = loop ? `${loop.name} selected. Click an arrangement slot.` : 'Loop selected.'
  }

  async function loadLoop(id: string): Promise<void> {
    const loop = loops.find((candidate) => candidate.id === id)
    if (!loop) return
    beat.sequencer.loadState(loop)
    beat.refresh()
    loopName.value = loop.name
    showWorkspace('instrument')
    loopSaveStatus.textContent = `Loaded ${loop.name}. Changes autosave as your working session.`
  }

  async function removeLoop(id: string): Promise<void> {
    await deleteLoop(id)
    project.slots = project.slots.map((loopId) => loopId === id ? null : loopId)
    await persistProject()
    await refreshLibrary()
  }

  loopSave.addEventListener('click', async () => {
    const name = loopName.value.trim() || `Loop ${loops.length + 1}`
    const now = Date.now()
    const loop: SavedLoop = {
      id: createId(),
      name,
      createdAt: now,
      updatedAt: now,
      ...cloneLoopState(beat.sequencer.getState()),
    }

    await saveLoop(loop)
    const persistent = await requestPersistentStorage()
    selectedLoopId = loop.id
    loopName.value = name
    loopSaveStatus.textContent = persistent
      ? `Saved ${name} locally. Persistent storage is enabled.`
      : `Saved ${name} locally in this browser.`
    await refreshLibrary()
  })

  required<HTMLButtonElement>('#daw-refresh').addEventListener('click', () => { void refreshLibrary() })
  required<HTMLButtonElement>('#daw-clear').addEventListener('click', async () => {
    project = emptyProject()
    await persistProject()
    renderArrangement(project, loops)
    status.textContent = 'Arrangement cleared.'
  })

  document.querySelectorAll<HTMLButtonElement>('[data-daw-slot]').forEach((button) => {
    button.addEventListener('click', async () => {
      const slot = Number(button.dataset.dawSlot)
      if (!selectedLoopId || !Number.isInteger(slot)) {
        status.textContent = 'Select a saved loop first.'
        return
      }
      project.slots[slot] = selectedLoopId
      await persistProject()
      renderArrangement(project, loops)
      const loop = loops.find((candidate) => candidate.id === selectedLoopId)
      status.textContent = `${loop?.name ?? 'Loop'} placed in slot ${slot + 1}.`
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-daw-remove]').forEach((button) => {
    button.addEventListener('click', async () => {
      const slot = Number(button.dataset.dawRemove)
      if (!Number.isInteger(slot)) return
      project.slots[slot] = null
      await persistProject()
      renderArrangement(project, loops)
      status.textContent = `Slot ${slot + 1} cleared.`
    })
  })

  await refreshLibrary()
}

function setupWorkspaceTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-workspace-tab]').forEach((button) => {
    button.addEventListener('click', () => showWorkspace(button.dataset.workspaceTab ?? 'instrument'))
  })
}

function showWorkspace(name: string): void {
  document.querySelectorAll<HTMLElement>('[data-workspace]').forEach((workspace) => {
    workspace.hidden = workspace.dataset.workspace !== name
  })
  document.querySelectorAll<HTMLButtonElement>('[data-workspace-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.workspaceTab === name)
    button.setAttribute('aria-selected', String(button.dataset.workspaceTab === name))
  })
}

function renderLibrary(
  root: HTMLElement,
  loops: SavedLoop[],
  selectedId: string | null,
  onSelect: (id: string) => Promise<void>,
  onLoad: (id: string) => Promise<void>,
  onDelete: (id: string) => Promise<void>,
): void {
  root.replaceChildren()

  if (!loops.length) {
    const empty = document.createElement('p')
    empty.className = 'daw-help'
    empty.textContent = 'No saved loops yet.'
    root.append(empty)
    return
  }

  loops.forEach((loop) => {
    const card = document.createElement('article')
    card.className = `loop-card${loop.id === selectedId ? ' selected' : ''}`

    const copy = document.createElement('div')
    copy.className = 'loop-card-copy'
    const title = document.createElement('strong')
    title.textContent = loop.name
    const meta = document.createElement('small')
    meta.textContent = `${loop.bpm} BPM · ${Math.round(loop.swing * 100)}% swing`
    copy.append(title, meta)

    const actions = document.createElement('div')
    actions.className = 'loop-card-actions'
    actions.append(
      miniButton('SELECT', () => { void onSelect(loop.id) }),
      miniButton('LOAD', () => { void onLoad(loop.id) }),
      miniButton('×', () => { void onDelete(loop.id) }, `Delete ${loop.name}`),
    )
    card.append(copy, actions)
    root.append(card)
  })
}

function renderArrangement(project: DawProject, loops: SavedLoop[]): void {
  document.querySelectorAll<HTMLElement>('[data-daw-slot-wrap]').forEach((wrapper) => {
    const index = Number(wrapper.dataset.dawSlotWrap)
    const loop = loops.find((candidate) => candidate.id === project.slots[index])
    const button = wrapper.querySelector<HTMLButtonElement>('[data-daw-slot]')
    if (!button) return
    wrapper.classList.toggle('filled', Boolean(loop))
    const label = button.querySelector<HTMLElement>('strong')
    if (label) label.textContent = loop?.name ?? 'EMPTY'
  })
}

function miniButton(label: string, action: () => void, ariaLabel?: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'loop-mini'
  button.textContent = label
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel)
  button.addEventListener('click', action)
  return button
}

function emptyProject(): DawProject {
  return {
    id: 'default-project',
    slots: Array.from({ length: DAW_SLOT_COUNT }, () => null),
    updatedAt: Date.now(),
  }
}

function createId(): string {
  return crypto.randomUUID?.() ?? `loop-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing DAW control ${selector}`)
  return element
}
