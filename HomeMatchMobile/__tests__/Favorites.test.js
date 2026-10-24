import AsyncStorage from '@react-native-async-storage/async-storage';
import {getFavorites,addFavorite,toggleFavorite} from '../src/services/favoriteService';

test('favorites are account scoped and concurrent writes do not lose a property',async()=>{
  await AsyncStorage.setItem('homematch_user',JSON.stringify({id:'first'}));
  await Promise.all([addFavorite({_id:'one'}),addFavorite({_id:'two'})]);
  expect((await getFavorites()).map(item=>item._id).sort()).toEqual(['one','two']);
  await AsyncStorage.setItem('homematch_user',JSON.stringify({id:'second'}));
  expect(await getFavorites()).toEqual([]);
  await addFavorite({_id:'three'});
  await AsyncStorage.setItem('homematch_user',JSON.stringify({id:'first'}));
  expect((await getFavorites()).map(item=>item._id).sort()).toEqual(['one','two']);
  expect((await toggleFavorite({_id:'one'})).isFavorite).toBe(false);
});
