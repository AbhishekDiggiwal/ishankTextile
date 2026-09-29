/* Recovery operations preserve existing records and never delete Storage objects. */
(function initAdminDataTools(global) {
  'use strict';
  const collections = ['categories', 'products', 'quotes', 'certificates', 'settings'];
  const safeKey = key => typeof key === 'string' && key.length > 0 && !['__proto__', 'prototype', 'constructor'].includes(key);
  const safeId = id => safeKey(id) && !id.includes('/') && !/^\.{1,2}$|^__.*__$/.test(id) && new TextEncoder().encode(id).length <= 1500;
  const fail = message => { throw new Error(message); };

  function encode(value, depth = 0) {
    if (depth > 30) fail('Backup contains excessively nested data.');
    if (value === null) return ['null'];
    if (typeof value === 'string' || typeof value === 'boolean') return [typeof value, value];
    if (typeof value === 'number') return ['number', Number.isFinite(value) ? value : String(value)];
    const sdk = global.firebase && global.firebase.firestore;
    if (sdk && typeof sdk.Timestamp === 'function' && value instanceof sdk.Timestamp) return ['timestamp', value.seconds, value.nanoseconds];
    if (sdk && typeof sdk.Blob === 'function' && value instanceof sdk.Blob) return ['bytes', value.toBase64()];
    if (sdk && typeof sdk.DocumentReference === 'function' && value instanceof sdk.DocumentReference) return ['reference', value.path];
    if (sdk && typeof sdk.GeoPoint === 'function' && value instanceof sdk.GeoPoint) return ['geopoint', value.latitude, value.longitude];
    if (Array.isArray(value)) return ['array', value.map(item => encode(item, depth + 1))];
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
      const entries = Object.keys(value).sort().map(key => {
        if (!safeKey(key)) fail('Backup contains an unsupported field name.');
        return [key, encode(value[key], depth + 1)];
      });
      return ['map', entries];
    }
    fail('Backup contains an unsupported value; no data was changed.');
  }

  function decode(value, db, depth = 0) {
    if (depth > 30 || !Array.isArray(value)) fail('Invalid backup value.');
    const [type, item, extra] = value;
    const sdk = global.firebase && global.firebase.firestore;
    switch (type) {
      case 'null': if (value.length === 1) return null; break;
      case 'string': case 'boolean': if (value.length === 2 && typeof item === type) return item; break;
      case 'number':
        if (value.length === 2 && typeof item === 'number' && Number.isFinite(item)) return item;
        if (value.length === 2 && ['NaN', 'Infinity', '-Infinity'].includes(item)) return Number(item);
        break;
      case 'timestamp':
        if (value.length === 3 && Number.isInteger(item) && Number.isInteger(extra)) return new sdk.Timestamp(item, extra);
        break;
      case 'geopoint':
        if (value.length === 3 && typeof item === 'number' && typeof extra === 'number') return new sdk.GeoPoint(item, extra);
        break;
      case 'bytes':
        if (value.length === 2 && typeof item === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item)) return sdk.Blob.fromBase64String(item);
        break;
      case 'reference':
        if (value.length === 2 && typeof item === 'string' && item.split('/').length % 2 === 0 && item.split('/').every(safeId)) return db.doc(item);
        break;
      case 'array': if (value.length === 2 && Array.isArray(item)) return item.map(entry => decode(entry, db, depth + 1)); break;
      case 'map': {
        if (value.length !== 2 || !Array.isArray(item)) break;
        const result = {};
        for (const entry of item) {
          if (!Array.isArray(entry) || entry.length !== 2 || !safeKey(entry[0]) || Object.hasOwn(result, entry[0])) fail('Invalid or duplicate backup field.');
          result[entry[0]] = decode(entry[1], db, depth + 1);
        }
        return result;
      }
      default: break;
    }
    fail('Invalid or unsupported backup value.');
  }

  async function readDocuments(db) {
    return Promise.all(collections.map(async name => {
      if (name !== 'settings') return (await db.collection(name).get({ source: 'server' })).docs;
      const docs = await Promise.all(['general', 'policies'].map(id => db.collection(name).doc(id).get({ source: 'server' })));
      return docs.filter(doc => doc.exists);
    }));
  }

  async function capture(db) {
    if (!db) fail('Connect to the database before creating a backup.');
    const snapshots = await readDocuments(db);
    const documents = Object.fromEntries(collections.map((name, index) => [name, snapshots[index].map(doc => ({ id: doc.id, data: encode(doc.data()) }))]));
    return {
      format: 'ishank-textile-backup', version: 2, exportedAt: new Date().toISOString(),
      documents, visitors: global.localStorage.getItem('visitors'),
      files: 'Existing Storage URLs are retained in document data. File bytes are not included; no files are deleted by restore or reset.'
    };
  }

  function planImport(backup, db) {
    if (!backup || backup.format !== 'ishank-textile-backup' || backup.version !== 2 || !backup.documents || Array.isArray(backup.documents)) {
      fail('Use a complete version 2 backup. Older exports may contain empty objects instead of records; no data was changed.');
    }
    if (Object.keys(backup.documents).some(name => !collections.includes(name))) fail('Unsupported backup collection.');
    const operations = [];
    for (const name of collections) {
      const records = backup.documents[name];
      if (!Array.isArray(records)) fail('Backup is missing a collection.');
      const ids = new Set();
      for (const record of records) {
        if (!record || !safeId(record.id) || ids.has(record.id)) fail('Invalid or duplicate backup record ID.');
        if (name === 'settings' && !['general', 'policies'].includes(record.id)) fail('Unsupported settings record.');
        ids.add(record.id);
        if (!Array.isArray(record.data) || record.data[0] !== 'map') fail('Invalid backup document.');
        const data = decode(record.data, db);
        if (new TextEncoder().encode(JSON.stringify(record.data)).byteLength > 1500000) fail('Backup record is too large to restore safely.');
        operations.push({ name, id: record.id, data });
      }
    }
    return operations;
  }

  function checkSize(operations) {
    if (operations.length > 500 || new TextEncoder().encode(JSON.stringify(operations.map(op => [op.name, op.id, encode(op.data)]))).byteLength > 8000000) {
      fail('This operation exceeds the safe atomic restore/reset limit (500 records or 8 MB). No records were changed.');
    }
  }

  async function restoreMissing(db, backup) {
    const operations = planImport(backup, db);
    // Filter first, then recheck inside the transaction so concurrent additions survive.
    const snapshots = await readDocuments(db);
    const existing = new Set(snapshots.flatMap((snapshot, index) => snapshot.map(doc => collections[index] + '/' + doc.id)));
    const missing = operations.filter(op => !existing.has(op.name + '/' + op.id));
    checkSize(missing);
    if (!missing.length) return { restored: 0, preserved: operations.length };
    return db.runTransaction(async transaction => {
      const refs = missing.map(op => db.collection(op.name).doc(op.id));
      const current = await Promise.all(refs.map(ref => transaction.get(ref)));
      let restored = 0;
      missing.forEach((op, index) => {
        if (!current[index].exists) { transaction.set(refs[index], op.data); restored++; }
      });
      return { restored, preserved: operations.length - restored };
    });
  }

  function toRest(value, resource) {
    const [type, item, extra] = value;
    switch (type) {
      case 'null': return { nullValue: null };
      case 'string': return { stringValue: item };
      case 'boolean': return { booleanValue: item };
      case 'number': return typeof item === 'number' && Number.isSafeInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
      case 'timestamp': return { timestampValue: new Date(item * 1000).toISOString().replace(/\.\d{3}Z$/, '.' + String(extra).padStart(9, '0') + 'Z') };
      case 'bytes': return { bytesValue: item };
      case 'geopoint': return { geoPointValue: { latitude: item, longitude: extra } };
      case 'reference': return { referenceValue: resource + '/' + item };
      case 'array': return { arrayValue: { values: item.map(entry => toRest(entry, resource)) } };
      case 'map': return { mapValue: { fields: Object.fromEntries(item.map(([key, entry]) => [key, toRest(entry, resource)])) } };
      default: fail('Unsupported reset value.');
    }
  }

  function fromRest(value, resource) {
    if ('nullValue' in value) return ['null'];
    if ('stringValue' in value) return ['string', value.stringValue];
    if ('booleanValue' in value) return ['boolean', value.booleanValue];
    if ('integerValue' in value) {
      const number = Number(value.integerValue);
      if (!Number.isSafeInteger(number)) fail('Reset cannot safely compare a 64-bit integer; no records changed.');
      return ['number', number];
    }
    if ('doubleValue' in value) return ['number', value.doubleValue];
    if ('timestampValue' in value) {
      const timestamp = value.timestampValue;
      const fractional = (timestamp.match(/\.(\d+)Z$/) || [null, ''])[1].padEnd(9, '0');
      return ['timestamp', Math.floor(Date.parse(timestamp) / 1000), Number(fractional)];
    }
    if ('bytesValue' in value) return ['bytes', value.bytesValue];
    if ('geoPointValue' in value) return ['geopoint', value.geoPointValue.latitude, value.geoPointValue.longitude];
    if ('referenceValue' in value) {
      if (!value.referenceValue.startsWith(resource + '/')) fail('Reset cannot compare a cross-database reference.');
      return ['reference', value.referenceValue.slice(resource.length + 1)];
    }
    if ('arrayValue' in value) return ['array', (value.arrayValue.values || []).map(entry => fromRest(entry, resource))];
    if ('mapValue' in value) return ['map', Object.keys(value.mapValue.fields || {}).sort().map(key => [key, fromRest(value.mapValue.fields[key], resource)])];
    fail('Unsupported stored value; reset cancelled.');
  }

  async function resetFromSnapshot(db, backup, defaults, user = global.firebaseServices && global.firebaseServices.auth && global.firebaseServices.auth.currentUser) {
    const records = planImport(backup, db).filter(op => op.name !== 'settings');
    const replacements = defaults.flatMap(({ name, records: items }) => items.map(data => ({ name, id: data.id, data })));
    const operations = new Map(records.map(op => [op.name + '/' + op.id, { ...op, remove: true }]));
    replacements.forEach(op => operations.set(op.name + '/' + op.id, op));
    const writes = [...operations.values()];
    checkSize(writes);
    if (!user || typeof user.getIdToken !== 'function') fail('Sign in again before resetting records.');
    const project = db.app.options.projectId;
    if (!/^[a-z][a-z0-9-]{3,62}$/.test(project)) fail('Invalid database project.');
    const resource = 'projects/' + project + '/databases/(default)/documents';
    const token = await user.getIdToken();
    const endpoint = 'https://firestore.googleapis.com/v1/' + resource;
    async function request(action, body) {
      const response = await global.fetch(endpoint + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body), signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) fail('Reset transaction failed; retain the backup and check current records.');
      return response.json();
    }
    const expected = new Map(records.map(op => [op.name + '/' + op.id, JSON.stringify(encode(op.data))]));
    let transaction;
    let committed = false;
    try {
      // REST supports collection reads inside a transaction; the web SDK only reads individual documents.
      transaction = (await request(':beginTransaction', { options: { readWrite: {} } })).transaction;
      const current = new Map();
      for (const name of collections.filter(name => name !== 'settings')) {
        const rows = await request(':runQuery', { transaction, structuredQuery: { from: [{ collectionId: name }], limit: 501 } });
        for (const row of rows) if (row.document) {
          const key = row.document.name.slice(resource.length + 1);
          current.set(key, JSON.stringify(fromRest({ mapValue: { fields: row.document.fields || {} } }, resource)));
          if (current.size > 500) fail('Reset exceeds the safe atomic limit; no records changed.');
        }
      }
      if (current.size !== expected.size || [...expected].some(([key, value]) => current.get(key) !== value)) {
        fail('Records changed after the backup. Reset cancelled; create a fresh backup and retry.');
      }
      const restWrites = writes.map(op => {
        const name = resource + '/' + op.name + '/' + op.id;
        return op.remove ? { delete: name } : { update: { name, fields: toRest(encode(op.data), resource).mapValue.fields } };
      });
      await request(':commit', { transaction, writes: restWrites });
      committed = true;
    } finally {
      if (transaction && !committed) {
        try { await request(':rollback', { transaction }); } catch (_) { /* An uncertain commit must never be retried automatically. */ }
      }
    }
  }

  function download(backup, prefix = 'ishank-textile-backup') {
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = prefix + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.AdminDataTools = Object.freeze({ capture, restoreMissing, resetFromSnapshot, download, encode, decode, planImport });
}(typeof window === 'undefined' ? globalThis : window));
