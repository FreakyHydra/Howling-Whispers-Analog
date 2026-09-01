export function setupWorkspaceNavigation(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-workspace-tab]').forEach((button) => {
    button.addEventListener('click', () => showWorkspace(button.dataset.workspaceTab ?? 'instrument'))
  })
}

export function showWorkspace(name: string): void {
  document.querySelectorAll<HTMLElement>('[data-workspace]').forEach((workspace) => {
    workspace.hidden = workspace.dataset.workspace !== name
  })
  document.querySelectorAll<HTMLButtonElement>('[data-workspace-tab]').forEach((button) => {
    const active = button.dataset.workspaceTab === name
    button.classList.toggle('active', active)
    button.setAttribute('aria-selected', String(active))
  })
}
