/* eslint-env jest */
import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {PanResponder} from 'react-native';
import {DraggableFurniture} from '../src/screens/RoomCustomizerScreen';
jest.mock('../src/services/api',()=>({get:jest.fn(),put:jest.fn()}));
jest.mock('@react-native-async-storage/async-storage',()=>({getItem:jest.fn(),setItem:jest.fn()}));
jest.mock('@react-native-vector-icons/material-design-icons/static',()=> 'Icon');

test('drag release uses current callbacks and current canvas after rerender',async()=>{
  let handlers;
  jest.spyOn(PanResponder,'create').mockImplementation(config=>{handlers=config;return {panHandlers:{}};});
  const first=jest.fn(),latest=jest.fn(),select=jest.fn();
  const item={id:'bed-1',type:'bed',x:20,y:30,width:40,height:60,rotation:0,image:1,imageScale:1};
  let tree;
  await act(async()=>{tree=Renderer.create(<DraggableFurniture item={item} selected={false} canvasSize={{width:300,height:360}} onSelect={select} onMoveEnd={first}/>);});
  await act(async()=>{tree.update(<DraggableFurniture item={item} selected={true} canvasSize={{width:100,height:120}} onSelect={select} onMoveEnd={latest}/>);});
  await act(async()=>{handlers.onPanResponderGrant();handlers.onPanResponderMove(null,{dx:500,dy:500});handlers.onPanResponderRelease();});
  expect(first).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledWith('bed-1',52,52);
  expect(select).toHaveBeenCalledWith('bed-1');
  await act(async()=>tree.unmount());
  jest.restoreAllMocks();
});