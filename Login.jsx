import { useState } from 'react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword,
  signInWithPopup, updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const friendlyError = (error) => ({
  'auth/invalid-email':'Digite um e-mail válido.',
  'auth/email-already-in-use':'Este e-mail já está cadastrado.',
  'auth/weak-password':'A senha precisa de pelo menos 6 caracteres.',
  'auth/invalid-credential':'E-mail ou senha incorretos.',
  'auth/too-many-requests':'Muitas tentativas. Tente novamente mais tarde.',
  'auth/popup-closed-by-user':'Login com Google cancelado.',
  'auth/operation-not-allowed':'Ative este provedor de login no console Firebase.',
  'auth/unauthorized-domain':'Adicione este domínio aos domínios autorizados do Firebase.',
}[error?.code] || 'Não foi possível entrar. Confira a configuração do Firebase e tente novamente.');

export default function Login() {
  const [register,setRegister] = useState(false);
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(''); setBusy(true);
    try {
      if (register) {
        const data = await createUserWithEmailAndPassword(auth,email.trim(),password);
        if(name.trim()) await updateProfile(data.user,{displayName:name.trim()});
      } else await signInWithEmailAndPassword(auth,email.trim(),password);
    } catch(err) { setError(friendlyError(err)); }
    finally {setBusy(false);}
  }

  async function googleLogin() {
    setError('');setBusy(true);
    try {await signInWithPopup(auth,new GoogleAuthProvider());}
    catch(err){setError(friendlyError(err));}
    finally{setBusy(false);}
  }

  return <main className="auth-layout">
    <section className="auth-intro">
      <div className="brand"><span className="brand-symbol">W</span><span>wordy <em>mini</em></span></div>
      <span className="eyebrow">UMA PALAVRA. VÁRIAS DESCOBERTAS.</span>
      <h1>Seu desafio<br/><span>começa aqui.</span></h1>
      <p>Descubra a senha do dia, encontre palavras escondidas e continue de onde parou em qualquer dispositivo.</p>
      <div className="auth-preview" aria-hidden="true"><span>W</span><span>O</span><span>R</span><span>D</span><span>Y</span></div>
    </section>
    <section className="auth-panel" aria-label="Autenticação">
      <div className="auth-card">
        <div className="auth-mobile-brand brand"><span className="brand-symbol">W</span><span>wordy <em>mini</em></span></div>
        <div className="auth-small-label">BEM-VINDO AO WORDY</div>
        <h2>{register ? 'Criar conta' : 'Entrar na sua conta'}</h2>
        <p className="muted">{register ? 'Salve suas descobertas na nuvem.' : 'Seu progresso está esperando por você.'}</p>
        <form onSubmit={submit}>
          {register&&<label>Nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?" autoComplete="name" maxLength={80}/></label>}
          <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required/></label>
          <label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete={register?'new-password':'current-password'} required minLength={register?6:1}/></label>
          {error&&<p role="alert" className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy?'Aguarde...':register?'Criar conta':'Entrar no Wordy'} <span>→</span></button>
        </form>
        <div className="divider-label"><span>ou continue com</span></div>
        <button className="google-button" type="button" disabled={busy} onClick={googleLogin}><strong className="google-g">G</strong> Google</button>
        <p className="auth-footer">{register?'Já possui conta?':'Ainda não tem uma conta?'} <button type="button" onClick={()=>{setRegister(!register);setError('');}}>{register?'Fazer login':'Criar uma conta'}</button></p>
      </div>
    </section>
  </main>;
}
