import { useEffect, useMemo, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { recordWord, watchProgress, emptyProgress } from '../lib/progress';
import { COURSES, getPuzzle, localDateKey, normalizeWord, shuffleLetters, canGrow, remainingWords } from '../lib/wordy';

const positions=['top','right','center','bottom','left'];

function WordList({puzzle,found}) {
  const [expanded,setExpanded]=useState(false);
  const groups=useMemo(()=>remainingWords(puzzle,found),[puzzle,found]);
  const total=puzzle.validWords.length;
  const remaining=total-found.length;
  return <section className="words-panel">
    <button className="words-toggle" type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>
      <span>Palavras do dia</span><span className="words-count">{found.length}/{total}</span><span aria-hidden="true" className={'chevron '+(expanded?'up':'')}/>
    </button>
    {expanded&&<div className="words-expanded">
      <p>{remaining===0?'Você encontrou todas as palavras de hoje!':`Faltam ${remaining} ${remaining===1?'palavra':'palavras'}.`}</p>
      {groups.map(g=><div className="word-group" key={g.size}>
        <div className="word-group-title"><span>{g.size} letras</span><span>{g.count}</span></div>
        <div className="remaining-items">{Array.from({length:g.count},(_,i)=><div className="remaining-item" key={i} aria-label={`Palavra de ${g.size} letras não encontrada`}>
          {Array.from({length:g.size},(_,j)=><i key={j}/>)}
        </div>)}</div>
      </div>)}
    </div>}
  </section>;
}

export default function Wordy({ user }) {
  const [course,setCourse]=useState('english');
  const [dayKey,setDayKey]=useState(()=>localDateKey());
  const puzzle=useMemo(()=>getPuzzle(course),[course,dayKey]);
  const boardLetters=useMemo(()=>shuffleLetters(puzzle.letters,puzzle.mainWord+':'+puzzle.dateKey),[puzzle]);
  const [progress,setProgress]=useState(emptyProgress);
  const progressRef=useRef(progress);
  const [loading,setLoading]=useState(true);
  const [draft,setDraft]=useState([]);
  const [result,setResult]=useState('');
  const [hint,setHint]=useState('');
  const [saveError,setSaveError]=useState('');
  const resultTimer=useRef(null);
  const lastChecked=useRef('');
  const inFlight=useRef(new Set());
  const screen=useRef(null);
  const current=draft.join('');
  const found=useMemo(()=>[...(progress.mainFound?[puzzle.mainWord]:[]),...progress.foundWords],[progress,puzzle]);
  const foundKey=found.join('|');

  useEffect(()=>{progressRef.current=progress;},[progress]);
  useEffect(()=>{
    const id=window.setInterval(()=>{const next=localDateKey();setDayKey(old=>old===next?old:next);},30000);
    return ()=>window.clearInterval(id);
  },[]);
  useEffect(()=>{
    setLoading(true);
    setProgress(emptyProgress());
    progressRef.current=emptyProgress();
    inFlight.current.clear();
    setDraft([]);setResult('');setHint('');setSaveError('');
    lastChecked.current='';
    if(resultTimer.current) clearTimeout(resultTimer.current);
    const stop=watchProgress(user.uid,puzzle,data=>{
      setProgress(data);progressRef.current=data;setLoading(false);setSaveError('');
    },()=>{setLoading(false);setSaveError('Não foi possível carregar o histórico. Verifique as regras do Firestore.');});
    return ()=>{stop();if(resultTimer.current)clearTimeout(resultTimer.current);};
  },[user.uid,puzzle]);

  function clearResult() {if(resultTimer.current)window.clearTimeout(resultTimer.current); resultTimer.current=null;}
  function evaluate(word, automatic=false) {
    const text=normalizeWord(word);
    if(text.length<3||loading)return;
    if(automatic&&lastChecked.current===text)return;
    lastChecked.current=text;
    if(!puzzle.validWords.includes(text)){
      if(text.length>=puzzle.mainWord.length){setResult('invalid');setHint('Essa palavra não está na lista do dia.');}
      return;
    }
    const known=progressRef.current.mainFound&&text===puzzle.mainWord||progressRef.current.foundWords.includes(text)||inFlight.current.has(text);
    if(known) {setResult('repeated');setHint('Essa palavra já foi encontrada.');return;}
    inFlight.current.add(text);
    const main=text===puzzle.mainWord;
    setResult(main?'main-success':'success');
    setHint(main?'Você descobriu a senha do dia!':'Nova palavra descoberta!');
    if(main&&navigator.vibrate)navigator.vibrate([100,40,160]);
    else if(navigator.vibrate)navigator.vibrate(65);
    recordWord(user.uid,puzzle,text).catch(()=>setSaveError(`A palavra ${text} não foi salva. Verifique a conexão e tente novamente.`))
      .finally(()=>inFlight.current.delete(text));
    clearResult();
    if(!canGrow(text,puzzle)){
      resultTimer.current=window.setTimeout(()=>{setDraft([]);setResult('');setHint('');lastChecked.current='';},780);
    } else {
      resultTimer.current=window.setTimeout(()=>{setResult('');setHint('');},780);
    }
  }

  function append(letter) {
    if(loading)return;
    const ch=normalizeWord(letter).slice(0,1);
    if(!ch||!puzzle.letters.includes(ch)||draft.length>=puzzle.mainWord.length)return;
    if((result==='success'||result==='main-success')&&!canGrow(current,puzzle))return;
    clearResult();setResult('');setHint('');setDraft([...draft,ch]);
  }
  function erase(){clearResult();setResult('');setHint('');lastChecked.current='';setDraft(v=>v.slice(0,-1));}
  function reset(){clearResult();setDraft([]);setResult('');setHint('');lastChecked.current='';}

  useEffect(()=>{if(current.length>=3)evaluate(current,true);},[current,loading,puzzle]);
  // Vincula apenas os comandos do jogo; não intercepta campos de formulário.
  const handlers=useRef({append,erase,evaluate,reset,current,puzzle});
  handlers.current={append,erase,evaluate,reset,current,puzzle};
  useEffect(()=>{
    const listener=(event)=>{
      if(event.altKey||event.ctrlKey||event.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName||''))return;
      const h=handlers.current;
      if(event.key==='Backspace'||event.key==='Delete') {event.preventDefault();h.erase();return;}
      if(event.key==='Escape'){h.reset();return;}
      if(event.key==='Enter') {event.preventDefault();h.evaluate(h.current);return;}
      if(event.key.length===1&&h.puzzle.letters.includes(normalizeWord(event.key))){event.preventDefault();h.append(event.key);}
    };
    document.addEventListener('keydown',listener);
    return ()=>document.removeEventListener('keydown',listener);
  },[]);
  useEffect(()=>{screen.current?.focus({preventScroll:true});},[course]);

  return <main className="wordy-layout" ref={screen} tabIndex={-1} aria-label="Minigame Wordy">
    <header className="game-header">
      <div className="game-header-left"><div className="brand-symbol small">W</div><div><h1>Wordy</h1><p>Descubra a senha do dia</p></div></div>
      <button className="logout" type="button" onClick={()=>signOut(auth)}>Sair <span>↗</span></button>
    </header>
    <div className="game-content">
      <div className="greeting"><div><span className="eyebrow">DESAFIO DIÁRIO</span><h2>Olá, {(user.displayName||user.email?.split('@')[0]||'jogador').split(' ')[0]}!</h2><p>Use as cinco letras para encontrar palavras.</p></div><span className="date-chip">{new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span></div>
      <div className="course-picker"><label htmlFor="language">Idioma</label><select id="language" value={course} onChange={e=>setCourse(e.target.value)}>{Object.entries(COURSES).map(([key,name])=><option value={key} key={key}>{name}</option>)}</select></div>
      <section className="password" aria-label="Insira a senha"><div className="password-title"><h2>Insira a senha</h2><button className="ghost-button" type="button" onClick={reset}>Limpar</button></div>
        <div className={'slots '+(result?'state-'+result:'')} aria-live="polite">{Array.from({length:5},(_,i)=><span className={'slot '+(draft[i]?'filled':'')} key={i}>{draft[i]||''}</span>)}</div>
        <div className={'result-hint '+(result?'show '+result:'')} role="status">{hint||'Escolha uma letra para começar'}</div>
      </section>
      <section className="board-wrapper" aria-label="Letras disponíveis"><div className="letter-board">{boardLetters.map((letter,index)=><button className="letter" data-position={positions[index]} type="button" key={letter+'-'+index} onClick={()=>append(letter)} disabled={loading}>{letter}</button>)}<button className="delete-key" onClick={erase} type="button" aria-label="Apagar última letra">⌫</button></div></section>
      <div className="game-bottom">
        {loading?<div className="loading-panel" role="status">Carregando seu progresso...</div>:<WordList puzzle={puzzle} found={found}/>}
        <section className="history"><div className="history-heading"><h2>Histórico</h2><span>{found.length} {found.length===1?'palavra':'palavras'}</span></div>
        {!found.length?<p className="history-empty">Ainda não descobriu nenhuma palavra.</p>:<div className="history-items">{found.map(word=><span key={word} className={word===puzzle.mainWord?'main-word':''}>{word===puzzle.mainWord?'★ ':''}{word}</span>)}</div>}</section>
        {saveError&&<p className="sync-error" role="alert">{saveError}</p>}
        <p className="sync-note">☁ Progresso salvo no Firebase por conta e por dia.</p>
      </div>
    </div>
  </main>;
}
