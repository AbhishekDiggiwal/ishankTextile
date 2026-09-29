(function initDocumentConverter(global) {
  'use strict';
  let active = false;
  async function convert(file) {
    if (active) throw new Error('Another document is being checked. Please wait.');
    if (typeof global.Worker !== 'function') throw new Error('This browser cannot safely convert Word documents. Use a current browser or a text file.');
    active = true;
    let worker;
    let timer;
    try {
      const buffer = await file.arrayBuffer();
      return await new Promise((resolve, reject) => {
        worker = new global.Worker('vendor/mammoth/document-worker.js');
        timer = setTimeout(() => reject(new Error('Document conversion took too long. The saved policy was not changed.')), 10000);
        worker.onmessage = event => {
          if (typeof event.data.value === 'string') resolve(event.data.value);
          else reject(new Error(event.data.error || 'Document conversion failed.'));
        };
        worker.onerror = () => reject(new Error('Document conversion failed. The saved policy was not changed.'));
        worker.postMessage(buffer, [buffer]);
      });
    } finally {
      clearTimeout(timer);
      if (worker) worker.terminate();
      active = false;
    }
  }
  global.DocumentConverter = Object.freeze({ convert });
}(window));
