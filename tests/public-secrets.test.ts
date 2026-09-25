import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {test} from 'node:test';

test('tracked files contain no delivery passwords, Colombian contact numbers or credential pages',()=>{
 const files=execFileSync('git',['ls-files','-co','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(file=>file && existsSync(file));
 const forbiddenArtifacts=new Set(['CREDENCIALES_PRUEBAS.md','credenciales.html']);
 assert.deepEqual(files.filter(file=>forbiddenArtifacts.has(file)),[]);
 const standardPassword=['Prueba','123!'].join('');
 const colombianContact=new RegExp(String.raw`\+57[\s-]*3\d{2}(?:[\s-]*\d){7}`,'g');
 const violations:string[]=[];
 for(const file of files){
  if(file.startsWith('tests/') || file.startsWith('specs/'))continue;
  if(!/\.(?:md|html|ts|tsx|js|mjs|json|yml|yaml|toml|txt)$/.test(file))continue;
  const text=readFileSync(file,'utf8');
  if(text.includes(standardPassword) || colombianContact.test(text))violations.push(file);
  colombianContact.lastIndex=0;
 }
 assert.deepEqual(violations,[]);
});
