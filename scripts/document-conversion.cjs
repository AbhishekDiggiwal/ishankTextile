const JSZip = require('jszip');
const mammoth = require('mammoth');
const limits = Object.freeze({ compressed: 5 * 1024 * 1024, expanded: 24 * 1024 * 1024, member: 8 * 1024 * 1024, xml: 2 * 1024 * 1024, entries: 512, html: 750000 });

async function convertDocument(arrayBuffer) {
  if (!arrayBuffer || !arrayBuffer.byteLength || arrayBuffer.byteLength > limits.compressed) throw new Error('Document exceeds the file size limit.');
  const zip = await JSZip.loadAsync(arrayBuffer);
  const entries = Object.values(zip.files);
  if (entries.length > limits.entries) throw new Error('Document contains too many parts.');
  if (!zip.file('word/document.xml')) throw new Error('This is not a valid Word document.');
  const bounded = new JSZip();
  let expanded = 0;
  for (const entry of entries) {
    if (entry.dir) continue;
    if (entry.name.startsWith('/') || entry.name.split('/').includes('..') || (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name)) throw new Error('Document contains an invalid part name.');
    const maxMember = /\.(?:xml|rels)$/i.test(entry.name) ? limits.xml : limits.member;
    const bytes = await new Promise((resolve, reject) => {
      let length = 0;
      let failed = false;
      const chunks = [];
      const stream = entry.internalStream('uint8array');
      stream.on('data', chunk => {
        if (failed) return;
        length += chunk.byteLength;
        expanded += chunk.byteLength;
        if (length > maxMember || expanded > limits.expanded) {
          failed = true;
          stream.pause();
          chunks.length = 0;
          reject(new Error('Document expands beyond the safe conversion limit.'));
          return;
        }
        chunks.push(chunk);
      }).on('error', reject).on('end', () => {
        if (failed) return;
        const result = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
        resolve(result);
      }).resume();
    });
    // Repackage only bounded, fully read data; Mammoth never inflates untrusted parts.
    bounded.file(entry.name, bytes);
  }
  const safeBuffer = await bounded.generateAsync({ type: 'arraybuffer', compression: 'STORE' });
  // Policy rendering discards images; do not expand repeated images into data URLs.
  const result = await mammoth.convertToHtml({ arrayBuffer: safeBuffer }, { convertImage: () => [] });
  if (new TextEncoder().encode(result.value).length > limits.html) throw new Error('Converted policy is too large to save safely.');
  return result.value;
}

module.exports = { convertDocument, limits };
