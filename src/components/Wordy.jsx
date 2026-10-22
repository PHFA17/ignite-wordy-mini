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
  const remaining=Math.max(0,total-found.length);
  return (
    <section className="wordy-words" aria-label="Palavras do dia">
      <button
        className={'wordy-words__toggle'+(expanded?' is-open':'')}
        type="button"
        aria-expanded={expanded}
        aria-controls="wordy-words-panel"
        onClick={()=>setExpanded(value=>!value)}
      >
        <span className="wordy-words__toggle-title">Palavras do dia</span>
        <span className="wordy-words__score">{found.length}/{total}</span>
        <span className="wordy-words__chevron" aria-hidden="true"/>
      </button>
      {expanded && <div className="wordy-words__panel" id="wordy-words-panel">
        <p className="wordy-words__summary">{remaining===0?'Você achou todas as palavras de hoje.':`Faltam ${remaining} palavra${remaining===1?'':'s'}.`}</p>
        {groups.map(group=><div className="wordy-words__group" key={group.size}>
          <h3 className="wordy-words__group-title">{group.size} letras<span>{group.count}</span></h3>
          <div className="wordy-words__list">
            {Array.from({length:group.count},(_,index)=><span
              className="wordy-words__item"
              key={index}
              aria-label={`Palavra de ${group.size} letras ainda não descoberta`}
            >
              {Array.from({length:group.size},(_,letter)=><i className="wordy-words__blank" key={letter} aria-hidden="true"/>)}
            </span>)}
          </div>
        </div>)}
      </div>}
    </section>
  );
}

export default function Wordy({ user }) {
  const [course,setCourse]=useState('english');
  const [viewport,setViewport]=useState(()=>{
    const width=typeof window==='undefined'?393:window.innerWidth;
    const height=typeof window==='undefined'?852:window.innerHeight;
    const scale=Math.min(1,width/393);
    return {scale,height:Math.max(500,Math.ceil(height/scale))};
  });
  useEffect(()=>{
    const update=()=>{
      const scale=Math.min(1,document.documentElement.clientWidth/393);
      const height=window.visualViewport?.height||window.innerHeight;
      setViewport({scale,height:Math.max(500,Math.ceil(height/scale))});
    };
    update();
    window.addEventListener('resize',update);
    window.visualViewport?.addEventListener('resize',update);
    return ()=>{window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);};
  },[]);
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

  return (
    <div className="wordy-mini-viewport" style={{'--wordy-scale':viewport.scale,'--wordy-height':viewport.height+'px'}}>
      <main className="wordy-screen wordy-screen--figma wordy-screen--scroll-v8"
        data-name="wordyTab" ref={screen} tabIndex={-1} aria-label="Minigame Wordy">
        <header className="wordy-head simple-page-header" aria-label="Cabeçalho do Wordy">
          <button className="simple-page-header__back" type="button" aria-label="Sair do Wordy" title="Sair da conta" onClick={()=>signOut(auth)}>
            <svg className="simple-page-header__back-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M15 5 8 12 15 19" />
            </svg>
          </button>
          <div className="simple-page-header__copy">
            <h1>Wordy</h1>
            <p>Descubra a senha do dia</p>
          </div>
          <div className="wordy-language" aria-label="Selecionar idioma">
            <span className="wordy-language__icon" aria-hidden="true">
              <svg className="wordy-language__globe" viewBox="0 0 24 24" focusable="false">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9" />
              </svg>
            </span>
            <select aria-label="Idioma" title="Selecionar idioma" value={course} onChange={event=>setCourse(event.target.value)}>
              {Object.entries(COURSES).map(([key,name])=><option key={key} value={key}>{key==='english'?'EN':key==='spanish'?'ES':'FR'} — {name}</option>)}
            </select>
          </div>
        </header>

        <div className="wordy-content-scroll">
          <div className="wordy-content-scroll__canvas">
            <section className="wordy-password" aria-label="Insira a senha">
              <h2>Insira a senha</h2>
              <div key={result+current} className={'wordy-password__slots'+(result?' is-'+result:'')} aria-live="polite">
                {Array.from({length:5},(_,index)=><span
                  className={'wordy-password__slot'+(draft[index]?' is-filled':'')+(result&&draft[index]?' is-result-slot':'')}
                  style={{'--wordy-slot-index':index}} key={index}
                >{draft[index]||''}</span>)}
              </div>
              <span className="wordy-visually-hidden" role="status" aria-live="polite">{hint}</span>
            </section>

            <section className="wordy-board" aria-label="Letras disponíveis para a senha">
              {boardLetters.map((letter,index)=><button
                className="wordy-letter" data-letter-position={positions[index]} type="button"
                key={letter+'-'+index} onClick={()=>append(letter)} disabled={loading}
                aria-label={`Inserir letra ${letter}`}
              >{letter}</button>)}
              <button className="wordy-delete-key" type="button" aria-label="Excluir a última letra" onClick={erase}>X</button>
            </section>

            <div className="wordy-bottom">
              {loading?<p className="wordy-loading" role="status">Carregando progresso...</p>:<WordList puzzle={puzzle} found={found}/>}
              <section className="wordy-history" aria-label="Histórico de palavras descobertas">
                <div className="wordy-history__title-row"><h2>Histórico</h2></div>
                {!found.length?<p>Ainda não descobriu nenhuma palavra</p>:<div className="wordy-history__list">
                  {found.map(word=><span className={'wordy-history__item'+(word===puzzle.mainWord?' is-main-word':'')} key={word}>{word}</span>)}
                </div>}
              </section>
              {saveError&&<p className="wordy-sync-error" role="alert">{saveError}</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
