import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const root = path.resolve(fileURLToPath(new URL('../../scrumWorkspace/', import.meta.url)));

export function isStored(pathname, kind) {
  const info = fs.lstatSync(pathname, { throwIfNoEntry: false });
  if (!info) return false;
  if (kind === 'directory' ? !info.isDirectory() : !info.isFile()) {
    throw Error('Invalid Scrum storage entry ' + pathname);
  }
  return true;
}

export function withWriteLock(write) {
  if (!isStored(root, 'directory')) throw Error('Scrum workspace is unavailable');
  const lock = path.join(root, '.write.lockdir');
  try {
    fs.mkdirSync(lock);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw Error('Scrum workspace is busy. Read and reconcile the affected record before retrying.');
  }
  try {
    return write();
  } finally {
    fs.rmdirSync(lock);
  }
}

export function writeAtomic(file, content) {
  const temporary = file + '.' + randomUUID() + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(temporary, content, { flag: 'wx', flush: true });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

export function writeJson(file, value) {
  writeAtomic(file, JSON.stringify(value, null, 2) + '\n');
}

export function schema(fields, required = []) {
  return { type: 'object', properties: fields, required, additionalProperties: false };
}

export function checkFields(object, fields, required = []) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw Error('Expected an object');
  for (const key of required) {
    if (!Object.hasOwn(object, key)) throw Error('Missing field ' + key);
  }
  for (const [key, value] of Object.entries(object)) {
    if (!Object.hasOwn(fields, key)) throw Error('Unknown field ' + key);
    const field = fields[key];
    const validType = {
      integer: () => Number.isSafeInteger(value),
      array: () => Array.isArray(value),
      object: () => value && typeof value === 'object' && !Array.isArray(value),
      string: () => typeof value === 'string'
    };
    if (!validType[field.type]() || (field.enum && !field.enum.includes(value))) {
      throw Error('Invalid ' + key);
    }
    if (value < field.minimum || value > field.maximum) throw Error('Out of range: ' + key);
    if (field.type === 'string' && (!value.trim() || value.length > 16000)) {
      throw Error('Invalid length: ' + key);
    }
  }
}

export function requireRevision(current, observed, label) {
  if (current !== observed) throw Error(label + ' revision changed. Read again before retrying.');
  if (current === Number.MAX_SAFE_INTEGER) throw Error(label + ' revision limit reached');
}
