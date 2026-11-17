import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../src/auth.js';

test('Anmeldung nur mit richtigem Passwort, Cookie ist fälschungssicher', () => {
  const a = createAuth({ password: 'geheim123' });
  assert.equal(a.checkPassword('falsch'), false);
  assert.equal(a.checkPassword('geheim123'), true);
  const cookie = a.cookieFor(true).split(';')[0];
  assert.equal(a.isTeacher(cookie), true);
  assert.equal(a.isTeacher('bubbl_teacher=9999999999999.gefaelscht'), false);
  assert.equal(a.isTeacher(''), false);
  const [name, val] = cookie.split('=');
  const [exp, sig] = val.split('.');
  assert.equal(a.isTeacher(`${name}=${Number(exp) + 1000}.${sig}`), false, 'Ablaufzeit nicht manipulierbar');
  assert.equal(createAuth({ password: 'anderes' }).isTeacher(cookie), false, 'Passwortwechsel macht Cookies ungültig');
});

test('Ohne konfiguriertes Passwort ist der Lehrkraft-Bereich gesperrt', () => {
  const a = createAuth({ password: '' });
  assert.equal(a.configured, false);
  assert.equal(a.checkPassword(''), false);
  assert.equal(a.isTeacher(a.cookieFor(false)), false);
});
