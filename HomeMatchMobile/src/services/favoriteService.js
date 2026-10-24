import AsyncStorage from '@react-native-async-storage/async-storage';

// Old shared favorites cannot safely be attributed to an account.
const prefix = '@homematch_favorites_v2_';
let queue = Promise.resolve();
async function accountKey() {
  const raw = await AsyncStorage.getItem('homematch_user');
  const user = raw ? JSON.parse(raw) : null;
  return prefix + encodeURIComponent(String(user?.id || user?._id || 'guest'));
}
async function readFavorites(key) {
  const raw = await AsyncStorage.getItem(key);
  const items = raw ? JSON.parse(raw) : [];
  return Array.isArray(items) ? items.filter(item => item && typeof item._id === 'string') : [];
}
function changeFavorites(update) {
  const keyPromise = accountKey();
  const result = queue.then(async () => {
    const key = await keyPromise;
    const next = update(await readFavorites(key));
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  });
  queue = result.catch(() => {});
  return result;
}
export const getFavorites = async () => readFavorites(await accountKey());
export const isFavorite = async propertyId => (await getFavorites()).some(item => String(item._id) === String(propertyId));
export const addFavorite = property => !property?._id ? getFavorites() : changeFavorites(items => items.some(item => item._id === property._id) ? items : [property,...items]);
export const removeFavorite = propertyId => changeFavorites(items => items.filter(item => item._id !== propertyId));
export const toggleFavorite = async property => {
  if (!property?._id) return {isFavorite:false,favorites:await getFavorites()};
  const favorites = await changeFavorites(items => items.some(item => item._id === property._id) ? items.filter(item => item._id !== property._id) : [property,...items]);
  return {isFavorite:favorites.some(item => item._id === property._id),favorites};
};
