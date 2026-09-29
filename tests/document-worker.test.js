/** @jest-environment node */
const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

async function docx(text, extra = {}) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>'+text+'</w:t></w:r></w:p></w:body></w:document>');
  for (const [name,value] of Object.entries(extra)) zip.file(name,value);
  return zip.generateAsync({ type:'arraybuffer', compression:'DEFLATE' });
}

function convert(buffer) {
  const source = fs.readFileSync(path.join(__dirname,'../public/vendor/mammoth/document-worker.js'),'utf8');
  const prelude = `const {parentPort}=require('node:worker_threads'); global.self=global; self.postMessage=value=>parentPort.postMessage(value); self.close=()=>{}; parentPort.on('message',data=>self.onmessage({data}));\n`;
  return new Promise((resolve,reject) => {
    const worker = new Worker(prelude+source,{eval:true,resourceLimits:{maxOldGenerationSizeMb:128}});
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('worker deadline')); },10000);
    worker.on('error',error=>{clearTimeout(timer);worker.terminate();reject(error);});
    worker.on('message',result=>{clearTimeout(timer);worker.terminate();resolve(result);});
    worker.postMessage(buffer,[buffer]);
  });
}

test('actual shipped worker preserves ordinary DOCX text and formatting', async()=>{
  const result=await convert(await docx('Sample policy'));
  expect(result.value).toContain('<strong>Sample policy</strong>');
});
test('actual shipped worker rejects small compressed documents with excessive XML expansion',async()=>{
  const buffer=await docx('x'.repeat(3*1024*1024)); expect(buffer.byteLength).toBeLessThan(10000);
  expect((await convert(buffer)).error).toMatch(/expands beyond/);
});
test('actual shipped worker counts expanded binary parts too',async()=>{
  expect((await convert(await docx('Policy',{'word/media/huge.bin':'x'.repeat(9*1024*1024)}))).error).toMatch(/expands beyond/);
});
test('actual shipped worker rejects malformed non-docx data',async()=>{
  expect((await convert(new Uint8Array([1,2,3]).buffer)).error).toBeTruthy();
});
test('shipped parser dependency manifest records patched xmldom',()=>{
  const versions=require('../public/vendor/mammoth/versions.json'); expect(versions['@xmldom/xmldom']).toBe('0.8.15');
});

test('repeated image references never expand into repeated base64 output', async()=>{
  const zip=await JSZip.loadAsync(await docx('Sample policy'));
  const drawing='<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="image1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  const xml=await zip.file('word/document.xml').async('string');
  zip.file('word/document.xml',xml.replace('</w:p>',drawing.repeat(64)+'</w:p>'));
  zip.file('word/_rels/document.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="image1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/one.png"/></Relationships>');
  zip.file('word/media/one.png',Buffer.alloc(2*1024*1024,1));
  zip.file('[Content_Types].xml',(await zip.file('[Content_Types].xml').async('string')).replace('</Types>','<Default Extension="png" ContentType="image/png"/></Types>'));
  const result=await convert(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}));
  expect(result.error).toBeUndefined();
  expect(result.value).toContain('<strong>Sample policy</strong>');
  expect(result.value).not.toContain('base64');
  expect(result.value.length).toBeLessThan(1000);
});
