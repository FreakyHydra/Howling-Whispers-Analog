import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const SRC = new URL('../src/', import.meta.url)
const MAIN_LIMIT = 40
const MODULE_LIMIT = 300

async function collectTsFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectTsFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(path)
  }

  return files
}

const srcPath = SRC.pathname
const files = await collectTsFiles(srcPath)
const violations = []

for (const file of files) {
  const content = await readFile(file, 'utf8')
  const lines = content.split(/\r?\n/).length
  const name = relative(srcPath, file)
  const limit = name === 'main.ts' ? MAIN_LIMIT : MODULE_LIMIT

  if (lines > limit) violations.push(`${name}: ${lines} lines exceeds ${limit}`)
}

if (violations.length) {
  console.error('Analog architecture guard failed:')
  violations.forEach((violation) => console.error(`  - ${violation}`))
  console.error('Split responsibilities into smaller modules before continuing.')
  process.exit(1)
}

console.log(`Architecture guard passed (${files.length} TypeScript modules checked).`)
