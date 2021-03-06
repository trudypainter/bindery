import error from './error';
import { prefixer } from '../dom';

global.BINDERY_VERSION = 'v0';
const el = error('Title', 'Desc');

test('Creates error', () => {
  expect(el.nodeType).toBe(Node.ELEMENT_NODE);
});

test('Sets error title', () => {
  expect(el.querySelector(prefixer('.error-title')).textContent).toBe('Title');
});
