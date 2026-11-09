// Runs a Python command with the project venv if present, else the system Python.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const candidates =
  process.platform === 'win32'
    ? ['.venv\\Scripts\\python.exe', 'scripts\\.venv\\Scripts\\python.exe', 'python', 'py']
    : ['.venv/bin/python', 'scripts/.venv/bin/python', 'python3', 'python'];

const python = candidates.find((c) => (!c.includes('/') && !c.includes('\\')) || existsSync(c));
const result = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' });
process.exit(result.status ?? 1);
