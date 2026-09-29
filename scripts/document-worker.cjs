const { convertDocument } = require('./document-conversion.cjs');
self.onmessage = async event => {
  try {
    const value = await convertDocument(event.data);
    self.postMessage({ value });
  } catch (error) {
    self.postMessage({ error: String(error.message || 'Document conversion failed.') });
  } finally { self.close(); }
};
