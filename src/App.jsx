import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, configured } from './lib/firebase';
import Login from './components/Login.jsx';
import Wordy from './components/Wordy.jsx';

export default function App() {
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(configured);
  useEffect(()=>{
    if(!auth)return;
    return onAuthStateChanged(auth,person=>{setUser(person);setLoading(false);},()=>setLoading(false));
  },[]);
  if(!configured)return <main className="setup-page"><div className="brand"><span className="brand-symbol">W</span> wordy mini</div><h1>Configuração do Firebase pendente</h1><p>Crie o arquivo <code>.env</code> com os dados do seu próprio projeto Firebase (use <code>.env.example</code> como modelo). Habilite Authentication e Firestore. Depois execute <code>npm run dev</code>.</p><p>Este mini projeto não se conecta ao banco do Ignite original.</p></main>;
  if(loading)return <main className="loading-app" role="status"><div className="brand-symbol">W</div><p>Preparando o Wordy...</p></main>;
  return user?<Wordy key={user.uid} user={user}/>:<Login/>;
}
