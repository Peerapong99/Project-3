/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/services/api',()=>({__esModule:true,API_ORIGIN:'https://test.invalid',default:{get:jest.fn(async()=>({data:{properties:[]}}))},onSessionExpired:jest.fn(()=>()=>{})}));

test('renders navigation and releases resources', async () => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => {tree = ReactTestRenderer.create(<App />);});
  expect(tree!.toJSON()).toBeTruthy();
  await ReactTestRenderer.act(async () => {tree!.unmount();});
});
