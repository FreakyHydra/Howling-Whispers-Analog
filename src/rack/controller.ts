type RackState = {
  order: string[]
  hidden: string[]
  collapsed: string[]
}

const STORAGE_KEY = 'hw-analog-rack-v1'

export function setupModuleRack(): void {
  const rack = document.querySelector<HTMLElement>('#sequencer-rack')
  if (!rack) return

  const modules = (): HTMLElement[] => Array.from(rack.querySelectorAll<HTMLElement>('[data-rack-module]'))

  restore(rack)
  refreshSummonButtons()

  rack.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const action = target.closest<HTMLButtonElement>('[data-module-action]')
    if (!action) return
    const module = action.closest<HTMLElement>('[data-rack-module]')
    if (!module) return

    const kind = action.dataset.moduleAction
    if (kind === 'remove') module.hidden = true
    if (kind === 'collapse') {
      module.classList.toggle('collapsed')
      action.textContent = module.classList.contains('collapsed') ? 'EXPAND' : 'COLLAPSE'
    }
    if (kind === 'up') move(module, -1)
    if (kind === 'down') move(module, 1)

    save(rack)
    refreshSummonButtons()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-module-summon]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.moduleSummon
      const module = id ? rack.querySelector<HTMLElement>(`[data-rack-module="${id}"]`) : null
      if (!module) return
      module.hidden = false
      module.classList.remove('collapsed')
      const collapse = module.querySelector<HTMLButtonElement>('[data-module-action="collapse"]')
      if (collapse) collapse.textContent = 'COLLAPSE'
      save(rack)
      refreshSummonButtons()
      module.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  })

  let dragging: HTMLElement | null = null
  modules().forEach((module) => {
    module.addEventListener('dragstart', (event) => {
      if (!(event.target as HTMLElement).closest('.rack-module-head')) {
        event.preventDefault()
        return
      }
      dragging = module
      module.classList.add('dragging')
    })
    module.addEventListener('dragend', () => {
      module.classList.remove('dragging')
      dragging = null
      save(rack)
    })
  })

  rack.addEventListener('dragover', (event) => {
    if (!dragging) return
    event.preventDefault()
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-rack-module]')
    if (!target || target === dragging) return
    const rect = target.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    rack.insertBefore(dragging, after ? target.nextSibling : target)
  })

  function refreshSummonButtons(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-module-summon]').forEach((button) => {
      const id = button.dataset.moduleSummon
      const module = id ? rack.querySelector<HTMLElement>(`[data-rack-module="${id}"]`) : null
      button.disabled = Boolean(module && !module.hidden)
      button.textContent = module && !module.hidden ? `${label(id)} ACTIVE` : `+ ${label(id)}`
    })
  }
}

function move(module: HTMLElement, direction: -1 | 1): void {
  const sibling = direction < 0 ? module.previousElementSibling : module.nextElementSibling
  if (!(sibling instanceof HTMLElement)) return
  const parent = module.parentElement
  if (!parent) return
  if (direction < 0) parent.insertBefore(module, sibling)
  else parent.insertBefore(sibling, module)
}

function save(rack: HTMLElement): void {
  try {
    const modules = Array.from(rack.querySelectorAll<HTMLElement>('[data-rack-module]'))
    const state: RackState = {
      order: modules.map((module) => module.dataset.rackModule ?? '').filter(Boolean),
      hidden: modules.filter((module) => module.hidden).map((module) => module.dataset.rackModule ?? '').filter(Boolean),
      collapsed: modules.filter((module) => module.classList.contains('collapsed')).map((module) => module.dataset.rackModule ?? '').filter(Boolean),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* optional UI persistence */ }
}

function restore(rack: HTMLElement): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const state = JSON.parse(raw) as RackState
    state.order?.forEach((id) => {
      const module = rack.querySelector<HTMLElement>(`[data-rack-module="${id}"]`)
      if (module) rack.append(module)
    })
    state.hidden?.forEach((id) => {
      const module = rack.querySelector<HTMLElement>(`[data-rack-module="${id}"]`)
      if (module) module.hidden = true
    })
    state.collapsed?.forEach((id) => {
      const module = rack.querySelector<HTMLElement>(`[data-rack-module="${id}"]`)
      if (!module) return
      module.classList.add('collapsed')
      const button = module.querySelector<HTMLButtonElement>('[data-module-action="collapse"]')
      if (button) button.textContent = 'EXPAND'
    })
  } catch { /* malformed old layout is ignored */ }
}

function label(id?: string): string {
  if (id === 'rhythm') return 'RHYTHM SEQUENCER'
  if (id === 'melodic') return 'SYNTH SEQUENCER'
  return 'MODULE'
}
