import test from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnTo,validOrigin} from '../lib/auth-config';
test('login redirects cannot leave the site or loop through auth',()=>{
 for(const path of ['https://attacker.invalid','//attacker.invalid','/\\attacker.invalid','/auth/confirm','/login?next=/admin',null])assert.equal(safeReturnTo(path),'/');
 assert.equal(safeReturnTo('/staff?month=2026-11'),'/staff?month=2026-11');
});
test('writes reject missing and cross-origin headers, regardless of Host',()=>{
 process.env.SITE_URL='https://staff.example.invalid';
 const url='https://internal.invalid/api/auth';
 assert.equal(validOrigin(new Request(url)),false);
 assert.equal(validOrigin(new Request(url,{headers:{origin:'https://attacker.invalid'}})),false);
 assert.equal(validOrigin(new Request(url,{headers:{origin:'https://staff.example.invalid'}})),true);
});
