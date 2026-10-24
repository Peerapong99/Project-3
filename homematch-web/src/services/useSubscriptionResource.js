import {useEffect, useState} from 'react';
import api from './Api';
export default function useSubscriptionResource(endpoint, pollMs = 0) {
  const [state,setState] = useState({endpoint:null,revision:-1,data:null,error:'',loading:true});
  const [revision,setRevision] = useState(0);
  const current = state.endpoint === endpoint && state.revision === revision;
  useEffect(()=>{
    let alive=true, pending=false;
    const controller=new AbortController();
    async function load() {
      if (pending) return;
      pending=true;
      try {
        const response=await api.get(endpoint,{signal:controller.signal});
        if(alive) setState({endpoint,revision,data:response.data,error:'',loading:false});
      } catch(error) {
        if(alive && error.code!=='ERR_CANCELED') setState({endpoint,revision,data:null,error:error.response?.data?.message || error.message,loading:false});
      } finally {pending=false;}
    }
    load();
    const timer=pollMs?setInterval(load,pollMs):null;
    return ()=>{alive=false;controller.abort();if(timer)clearInterval(timer);};
  },[endpoint,pollMs,revision]);
  return {data:current?state.data:null,error:current?state.error:'',loading:!current || state.loading,reload:()=>setRevision(value=>value+1)};
}
