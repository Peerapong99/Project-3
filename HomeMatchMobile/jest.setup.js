/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map();
  return {getItem:jest.fn(async key=>storage.get(key) ?? null),setItem:jest.fn(async(key,value)=>{storage.set(key,value);}),removeItem:jest.fn(async key=>{storage.delete(key);}),setMany:jest.fn(async values=>{Object.entries(values).forEach(([key,value])=>storage.set(key,value));})};
});
jest.mock('@react-native-google-signin/google-signin',()=>({GoogleSignin:{configure:jest.fn(),hasPlayServices:jest.fn(),signIn:jest.fn()},statusCodes:{},isCancelledResponse:jest.fn(),isErrorWithCode:jest.fn()}));
jest.mock('@react-native-vector-icons/material-design-icons/static',()=> 'Icon');
jest.mock('react-native-webview',()=>({WebView:'WebView'}));
jest.mock('react-native-image-picker',()=>({launchImageLibrary:jest.fn()}));
