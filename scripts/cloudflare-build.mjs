import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

function removeJsonComments(source) {
  let output = '', inString = false, escaped = false
  for (let index = 0; index < source.length; index++) {
    const char = source[index], next = source[index + 1]
    if (inString) {
      output += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
    } else if (char === '"') {
      inString = true; output += char
    } else if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index++
      output += '\n'
    } else if (char === '/' && next === '*') {
      index += 2
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index++
      index++; output += ' '
    } else output += char
  }
  return output
}

const mode = process.argv[2]
if (!['build', 'preview', 'deploy'].includes(mode)) {
  console.error('Usage: node scripts/cloudflare-build.mjs <build|preview|deploy>')
  process.exit(2)
}

const configPath = resolve('wrangler.jsonc')
const config = JSON.parse(removeJsonComments(readFileSync(configPath, 'utf8')))
const publicVars = Object.fromEntries(Object.entries(config.vars ?? {}).filter(([name, value]) => name.startsWith('NEXT_PUBLIC_') && typeof value === 'string'))
const env = { ...process.env, ...publicVars }
const cli = resolve('node_modules/@opennextjs/cloudflare/dist/cli/index.js')

function run(command) {
  const result = spawnSync(process.execPath, [cli, command], { cwd: process.cwd(), env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('build')
if (mode === 'preview') run('preview')
if (mode === 'deploy') run('deploy')
