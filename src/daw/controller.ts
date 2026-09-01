import { normalizeWorkingSession } from '../loops/normalize'
import {
  DAW_SLOT_COUNT,
  cloneDrumState,
  cloneSynthState,
  loopBpm,
  type DawProject,
  type LoopKind,
  type SavedLoop,
  type WorkingSession,
} from '../loops/types'
import type { MelodicSequencerController } from '../melodic/controller'
import type { AnalogPatch } from '../patch'
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
import { setupArrangementPlayback } from './playback'

type Options = {
  beat: BeatSequencerController
  melodic: MelodicSequencerController
  patch: AnalogPatch
  loadPatch: (patch: AnalogPatch) => void
}

export type DawWorkspaceController = {
  requestAutosave: () => void
}

export async function setupDawWorkspace({ beat, melodic, patch, loadPatch }: Options): Promise<DawWorkspaceController> {
  let loops: SavedLoop[] = []
  let selectedLoopId: string | null = null
  let project: DawProject = await loadDawProject() ?? emptyProject()
  let saveTimer: number | undefined

  const library = required<HTMLElement>('#daw-library')
  const status = required<HTMLElement>('#daw-status')
  const loopName = required<HTMLInputElement>('#loop-name')
  const saveStatus = required<HTMLElement>('#loop-save-status')

  setupWorkspaceTabs()

  const requestAutosave = (): void => {
    if (saveTimer !== undefined) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      const session: WorkingSession = {
        id: 'working-session',
        drum: beat.sequencer.getState(),
        synth: melodic.getState(),
        updatedAt: Date.now(),
      }
      void saveWorkingSession(session)
    }, 350)
  }

  const rawRestore = await loadWorkingSession()
  const restore = normalizeWorkingSession(rawRestore, patch)
  if (restore) {
    beat.sequencer.loadState(restore.drum)
    melodic.sequencer.loadState(restore.synth)
    loadPatch(restore.synth.patch)
    beat.refresh()
    melodic.refresh()
    saveStatus.textContent = 'Working session restored from this browser.'
  }

  beat.sequencer.onChange = requestAutosave
  melodic.sequencer.onChange = requestAutosave

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

    if (loop.drum) {
      beat.sequencer.loadState(loop.drum)
      beat.refresh()
    }
    if (loop.synth) {
      melodic.sequencer.loadState(loop.synth)
      loadPatch(loop.synth.patch)
      melodic.refresh()
    }

    loopName.value = loop.name
    showWorkspace('instrument')
    saveStatus.textContent = `Loaded ${loop.name}. Changes autosave as your working session.`
    requestAutosave()
  }

  async function removeLoop(id: string): Promise<void> {
    await deleteLoop(id)
    project.slots = project.slots.map((loopId) => loopId === id ? null : loopId)
    await persistProject()
    await refreshLibrary()
  }

  const saveNamedLoop = async (kind: LoopKind): Promise<void> => {
    const name = loopName.value.trim() || `Loop ${loops.length + 1}`
    const now = Date.now()
    const loop: SavedLoop = {
      id: createId(),
      name,
      kind,
      drum: kind === 'synth' ? undefined : cloneDrumState(beat.sequencer.getState()),
      synth: kind === 'drum' ? undefined : cloneSynthState(melodic.getState()),
      createdAt: now,
      updatedAt: now,
    }

    await saveLoop(loop)
    const persistent = await requestPersistentStorage()
    selectedLoopId = loop.id
    loopName.value = name
    saveStatus.textContent = persistent
      ? `Saved ${name} (${kind}) locally with persistent storage.`
      : `Saved ${name} (${kind}) locally in this browser.`
    await refreshLibrary()
  }

  required<HTMLButtonElement>('#loop-save-drums').addEventListener('click', () => { void saveNamedLoop('drum') })
  required<HTMLButtonElement>('#loop-save-synth').addEventListener('click', () => { void saveNamedLoop('synth') })
  required<HTMLButtonElement>('#loop-save-combined').addEventListener('click', () => { void saveNamedLoop('combined') })

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

  setupArrangementPlayback({
    getProject: () => project,
    getLoops: () => loops,
    status,
  })

  await refreshLibrary()
  return { requestAutosave }
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
    meta.textContent = `${loop.kind.toUpperCase()} · ${loopBpm(loop)} BPM`
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
    const kind = button.querySelector<HTMLElement>('[data-slot-kind]')
    if (kind) kind.textContent = loop?.kind.toUpperCase() ?? ''
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
