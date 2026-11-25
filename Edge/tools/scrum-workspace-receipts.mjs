import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { checkFields, isStored, root, schema, writeJson } from './scrum-workspace-storage.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function receiptFile(requestId) {
  if (typeof requestId !== 'string' || !uuid.test(requestId)) throw Error('Use a UUID for requestId');
  return path.join(root, 'receipts', requestId.toLowerCase() + '.json');
}

export function readReceipt(requestId) {
  const file = receiptFile(requestId);
  if (!isStored(file, 'file')) return null;
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (failure) {
    throw Error('Invalid stored receipt for ' + requestId + ': ' + failure.message);
  }
  if (!receipt || receipt.requestId !== requestId.toLowerCase() ||
      !['create', 'update'].includes(receipt.operation) ||
      typeof receipt.id !== 'string' || !receipt.submitted || !receipt.result ||
      typeof receipt.at !== 'string') {
    throw Error('Invalid stored receipt for ' + requestId);
  }
  return receipt;
}

export function recoverReceipt({ requestId, operation, id, submitted }) {
  const receipt = readReceipt(requestId);
  if (!receipt) return null;
  if (receipt.operation !== operation || receipt.id !== id ||
      !isDeepStrictEqual(receipt.submitted, submitted)) {
    throw Error('Request ID already used with different fields');
  }
  return receipt.result;
}

export function writeReceipt({ requestId, operation, id, submitted, result }) {
  const file = receiptFile(requestId);
  const receipt = {
    requestId: requestId.toLowerCase(),
    operation,
    id,
    submitted,
    result,
    at: new Date().toISOString()
  };
  writeJson(file, receipt);
  return receipt;
}

export const receiptTool = {
  name: 'receipt',
  description: 'Read the saved result of a create or update by its requestId. A missing receipt does not prove an unreceipted write had no effect; query the record as well.',
  inputSchema: schema({ requestId: { type: 'string', description: 'UUID supplied to create or update' } }, ['requestId'])
};

export function receiptAction(input) {
  checkFields(input, { requestId: { type: 'string' } }, ['requestId']);
  const receipt = readReceipt(input.requestId);
  return receipt ? { found: true, ...receipt } : { found: false, requestId: input.requestId.toLowerCase() };
}
