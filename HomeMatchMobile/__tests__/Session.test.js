import AsyncStorage from '@react-native-async-storage/async-storage';
import api,{onSessionExpired} from '../src/services/api';
const rejectResponse=api.interceptors.response.handlers[0].rejected;
const unauthorized=token=>({config:{headers:{Authorization:'Bearer '+token}},response:{status:401}});

test('expired session is removed and navigation is notified; errors from an old account leave the new session intact',async()=>{
 const listener=jest.fn();const unsubscribe=onSessionExpired(listener);
 await AsyncStorage.setMany({homematch_token:'new-session',homematch_user:JSON.stringify({id:'new-user'})});
 const oldError=unauthorized('old-session');
 await expect(rejectResponse(oldError)).rejects.toBe(oldError);
 expect(await AsyncStorage.getItem('homematch_token')).toBe('new-session');expect(listener).not.toHaveBeenCalled();
 const currentError=unauthorized('new-session');
 await expect(rejectResponse(currentError)).rejects.toBe(currentError);
 expect(await AsyncStorage.getItem('homematch_token')).toBeNull();expect(await AsyncStorage.getItem('homematch_user')).toBeNull();expect(listener).toHaveBeenCalledTimes(1);
 unsubscribe();
});
