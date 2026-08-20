// ===== Sidebar (mobile) =====
function initSidebar(){
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('[data-sidebar-toggle]');
  const overlay = document.querySelector('.overlay');
  if(!sidebar || !toggleBtn) return;

  function open(){
    sidebar.classList.add('open');
    overlay.classList.add('open');
    toggleBtn.setAttribute('aria-expanded','true');
  }
  function close(){
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded','false');
  }
  toggleBtn.addEventListener('click',()=>{
    sidebar.classList.contains('open') ? close() : open();
  });
  overlay && overlay.addEventListener('click',close);
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape') close();
  });
}

// ===== Accordion =====
function initAccordions(){
  document.querySelectorAll('.accordion-trigger').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const expanded = btn.getAttribute('aria-expanded')==='true';
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!expanded));
      if(panel){
        if(!expanded){
          panel.classList.add('open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }else{
          panel.style.maxHeight = panel.scrollHeight + 'px';
          requestAnimationFrame(()=>{ panel.style.maxHeight = '0px'; });
          panel.classList.remove('open');
        }
      }
    });
  });
  // keep open panels sized correctly on resize
  window.addEventListener('resize',()=>{
    document.querySelectorAll('.accordion-panel.open').forEach(p=>{
      p.style.maxHeight = p.scrollHeight + 'px';
    });
  });
}

// ===== Glossary flip cards =====
// Delegated on document so it works for cards added dynamically
// (e.g. glossary grids built by inline page scripts) without ever
// double-binding a listener to the same button.
function initFlipCards(){
  if(document.body.dataset.flipCardsBound) return;
  document.body.dataset.flipCardsBound = 'true';
  document.addEventListener('click',(e)=>{
    const btn = e.target.closest('.flip-card-btn');
    if(!btn) return;
    const card = btn.closest('.flip-card');
    const flipped = card.classList.toggle('flipped');
    btn.setAttribute('aria-pressed', String(flipped));
  });
}

// ===== Quiz engine =====
// quizData: [{ q, options:[{text, correct}], explain }]
function initQuiz(containerId, quizData){
  const root = document.getElementById(containerId);
  if(!root) return;

  let current = 0;
  let score = 0;
  let answered = new Array(quizData.length).fill(false);

  const els = {
    scoreLabel: root.querySelector('[data-score]'),
    progressBar: root.querySelector('[data-progress-bar]'),
    questionBody: root.querySelector('[data-question-body]'),
    nav: root.querySelector('[data-quiz-nav]'),
    result: root.querySelector('[data-quiz-result]'),
    body: root.querySelector('[data-quiz-body]')
  };

  function renderQuestion(){
    const item = quizData[current];
    els.progressBar.style.width = ((current)/quizData.length*100) + '%';
    els.scoreLabel.textContent = `Score: ${score}/${quizData.length}`;

    const optsHtml = item.options.map((opt,i)=>
      `<li><button class="quiz-option" type="button" data-idx="${i}">${opt.text}</button></li>`
    ).join('');

    els.questionBody.innerHTML = `
      <div class="quiz-question">
        <p>${current+1}. ${item.q}</p>
      </div>
      <ul class="quiz-options" role="list">${optsHtml}</ul>
      <div class="quiz-feedback-holder" aria-live="polite"></div>
    `;

    const buttons = els.questionBody.querySelectorAll('.quiz-option');
    buttons.forEach(b=>{
      b.addEventListener('click',()=>{
        if(answered[current]) return;
        answered[current] = true;
        const idx = Number(b.dataset.idx);
        const correctIdx = item.options.findIndex(o=>o.correct);
        buttons.forEach(bb=>bb.disabled = true);

        if(idx === correctIdx){
          b.classList.add('correct');
          score++;
        }else{
          b.classList.add('incorrect');
          buttons[correctIdx].classList.add('correct');
        }
        els.scoreLabel.textContent = `Score: ${score}/${quizData.length}`;

        const holder = els.questionBody.querySelector('.quiz-feedback-holder');
        const isCorrect = idx===correctIdx;
        holder.innerHTML = `<div class="quiz-feedback ${isCorrect?'correct':'incorrect'}">
          <strong>${isCorrect?'Correct.':'Not quite.'}</strong> ${item.explain}
        </div>`;

        renderNav();
      });
    });

    renderNav();
  }

  function renderNav(){
    const isLast = current === quizData.length - 1;
    const canAdvance = answered[current];
    els.nav.innerHTML = `
      <button class="btn btn-ghost" type="button" data-prev ${current===0?'disabled':''}>Back</button>
      <button class="btn btn-primary" type="button" data-next ${canAdvance? '' : 'disabled'}>${isLast? 'See results':'Next'}</button>
    `;
    const prevBtn = els.nav.querySelector('[data-prev]');
    const nextBtn = els.nav.querySelector('[data-next]');
    prevBtn.addEventListener('click',()=>{
      if(current>0){ current--; renderQuestion(); }
    });
    nextBtn.addEventListener('click',()=>{
      if(!answered[current]) return;
      if(current < quizData.length-1){
        current++;
        renderQuestion();
      }else{
        showResult();
      }
    });
  }

  function showResult(){
    els.progressBar.style.width = '100%';
    els.body.innerHTML = `
      <div class="quiz-result">
        <div class="big">${score}/${quizData.length}</div>
        <p>${score===quizData.length? 'Perfect score. Nicely done.' : 'Review the sections above and try again.'}</p>
        <button class="btn btn-primary" type="button" data-retry>Retry quiz</button>
      </div>
    `;
    els.body.querySelector('[data-retry]').addEventListener('click',()=>{
      current = 0; score = 0; answered = new Array(quizData.length).fill(false);
      rebuildBody();
      renderQuestion();
    });
  }

  function rebuildBody(){
    els.body.innerHTML = `
      <div class="quiz-progress"><div class="quiz-progress-bar" data-progress-bar></div></div>
      <div data-question-body></div>
      <div class="quiz-nav" data-quiz-nav></div>
    `;
    els.progressBar = root.querySelector('[data-progress-bar]');
    els.questionBody = root.querySelector('[data-question-body]');
    els.nav = root.querySelector('[data-quiz-nav]');
  }

  renderQuestion();
}

document.addEventListener('DOMContentLoaded',()=>{
  initSidebar();
  initAccordions();
  initFlipCards();
});
