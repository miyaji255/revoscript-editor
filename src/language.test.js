import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {analyze,sample} from './language.js';
test('balanced examples do not produce syntax errors',()=>assert.equal(analyze(sample).filter(x=>x.severity==='error').length,0));
test('unbalanced parentheses are reported',()=>assert.equal(analyze('WaitForSeconds(1').at(0).severity,'error'));
test('unknown commands produce errors',()=>assert.equal(analyze('NewCommand(1)')[0].severity,'error'));
test('wrong arity produces an error',()=>assert.equal(analyze('EnterIC(1)')[0].severity,'error'));
test('left to right condition warning',()=>assert.equal(analyze('if (EP > 1 && IP > 2 || AP > 3)','en')[0].severity,'info'));
