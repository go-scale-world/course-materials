(function(){
  "use strict";

  /* ---------------- Reading progress ---------------- */
  var progressFill = document.getElementById('readProgress');
  function updateProgress(){
    if(!progressFill) return;
    var h = document.documentElement;
    var scrollTop = h.scrollTop || document.body.scrollTop;
    var scrollHeight = h.scrollHeight - h.clientHeight;
    var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressFill.style.width = pct + '%';
  }
  document.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('load', updateProgress);
  updateProgress();

  /* ---------------- Sidebar (mobile) ---------------- */
  var sidebar = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var sidebarOverlay = document.getElementById('sidebarOverlay');

  function openSidebar(){
    if(!sidebar) return;
    sidebar.classList.add('open');
    if(sidebarOverlay) sidebarOverlay.classList.add('open');
    if(sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar(){
    if(!sidebar) return;
    sidebar.classList.remove('open');
    if(sidebarOverlay) sidebarOverlay.classList.remove('open');
    if(sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
  }
  if(sidebarToggle){
    sidebarToggle.addEventListener('click', function(){
      var isOpen = sidebar.classList.contains('open');
      if(isOpen){ closeSidebar(); } else { openSidebar(); }
    });
  }
  if(sidebarOverlay){ sidebarOverlay.addEventListener('click', closeSidebar); }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeSidebar();
  });
  if(sidebar){
    sidebar.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        if(window.matchMedia('(max-width: 900px)').matches){ closeSidebar(); }
      });
    });
  }

  /* ---------------- Active sidebar link ---------------- */
  (function highlightActive(){
    var here = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-link').forEach(function(a){
      var href = a.getAttribute('href');
      if(!href) return;
      var file = href.split('/').pop();
      if(file === here){ a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
    });
  })();

  /* ---------------- In-page jump nav active state ---------------- */
  var jumpLinks = document.querySelectorAll('.jump-nav a[href^="#"]');
  if(jumpLinks.length){
    var jumpTargets = Array.prototype.slice.call(jumpLinks).map(function(a){
      return document.getElementById(a.getAttribute('href').slice(1));
    }).filter(Boolean);
    var jumpObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var id = entry.target.id;
          jumpLinks.forEach(function(a){
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    jumpTargets.forEach(function(t){ jumpObserver.observe(t); });
  }

  /* ---------------- Tabs (scoped per .tabs container, supports many per page) ---------------- */
  document.querySelectorAll('.tabs').forEach(function(tabsRoot){
    var buttons = Array.prototype.slice.call(tabsRoot.querySelectorAll('.tab-btn'));
    if(!buttons.length) return;
    function activate(btn){
      var target = btn.getAttribute('data-tab');
      buttons.forEach(function(b){
        var selected = b === btn;
        b.setAttribute('aria-selected', selected ? 'true' : 'false');
        b.tabIndex = selected ? 0 : -1;
      });
      tabsRoot.querySelectorAll('.tab-panel').forEach(function(panel){
        panel.hidden = panel.id !== 'panel-' + target;
      });
      tabsRoot.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: target } }));
    }
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){ activate(btn); });
      btn.addEventListener('keydown', function(e){
        var i = buttons.indexOf(btn);
        if(e.key === 'ArrowRight'){ e.preventDefault(); var n = buttons[(i+1) % buttons.length]; n.focus(); activate(n); }
        if(e.key === 'ArrowLeft'){ e.preventDefault(); var p = buttons[(i-1+buttons.length) % buttons.length]; p.focus(); activate(p); }
      });
    });
  });

  /* ---------------- Flip cards (glossary) ---------------- */
  document.querySelectorAll('.flip-card').forEach(function(card){
    var btn = card.querySelector('button');
    if(!btn) return;
    btn.addEventListener('click', function(){
      var flipped = card.classList.toggle('flipped');
      btn.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    });
  });

  /* ---------------- Reveal / guess cards (declarative via data-answer="yes|no") ---------------- */
  document.querySelectorAll('.reveal-list').forEach(function(list){
    list.addEventListener('click', function(e){
      var btn = e.target.closest('.guess-btn');
      if(!btn) return;
      var card = btn.closest('.reveal-card');
      var correctAnswer = card.getAttribute('data-answer');
      var choice = btn.getAttribute('data-choice');
      card.querySelectorAll('.guess-btn').forEach(function(b){ b.classList.remove('picked'); });
      btn.classList.add('picked');
      var panel = card.querySelector('[data-answer-panel]');
      if(panel) panel.classList.add('show');
      var badge = card.querySelector('.reveal-badge');
      if(badge){ badge.classList.remove('yes','no'); badge.classList.add(correctAnswer); }
      var verdict = card.querySelector('[data-verdict]');
      if(verdict){
        if(choice === correctAnswer){
          verdict.textContent = 'Nice — that matches.';
          verdict.className = 'reveal-correct right';
        } else {
          verdict.textContent = 'Not quite — the correct call is "' + (correctAnswer === 'yes' ? 'Yes' : 'No') + '".';
          verdict.className = 'reveal-correct wrong';
        }
      }
    });
  });

  /* ---------------- Generic Quiz Engine — reads JSON from data-quiz attribute ---------------- */
  function initQuiz(root){
    var raw = root.getAttribute('data-quiz');
    if(!raw) return;
    var questions;
    try { questions = JSON.parse(raw); } catch(err){ console.error('Bad quiz JSON', err); return; }
    if(!questions || !questions.length) return;

    var qHost = root.querySelector('[data-questions]');
    var scoreEl = root.querySelector('[data-score]');
    var totalEl = root.querySelector('[data-total]');
    var progressFillEl = root.querySelector('[data-progress]');
    var prevBtn = root.querySelector('[data-prev]');
    var nextBtn = root.querySelector('[data-next]');
    var navControls = root.querySelector('[data-nav-controls]');
    var resultEl = root.querySelector('[data-result]');
    var retryBtn = root.querySelector('[data-retry]');
    var finalScoreEl = root.querySelector('[data-final-score]');
    var finalTotalEl = root.querySelector('[data-final-total]');
    var finalMsgEl = root.querySelector('[data-final-msg]');

    var state = { current: 0, answered: [], score: 0 };
    totalEl.textContent = questions.length;
    finalTotalEl.textContent = questions.length;

    qHost.innerHTML = '';
    questions.forEach(function(q, qi){
      var block = document.createElement('div');
      block.className = 'q-block';
      block.setAttribute('data-qindex', qi);
      var optsHtml = q.options.map(function(opt, oi){
        return '<button class="q-option" type="button" data-oi="' + oi + '"><span>' + opt + '</span><span class="mark" aria-hidden="true"></span></button>';
      }).join('');
      block.innerHTML =
        '<p class="q-prompt">' + (qi+1) + '. ' + q.prompt + '</p>' +
        '<div class="q-options" role="radiogroup" aria-label="Answer options">' + optsHtml + '</div>' +
        '<div class="q-feedback" data-feedback><p class="verdict" data-verdict></p><p data-explain></p></div>';
      qHost.appendChild(block);
    });

    var blocks = qHost.querySelectorAll('.q-block');

    function render(){
      blocks.forEach(function(b, i){ b.classList.toggle('active', i === state.current); });
      prevBtn.disabled = state.current === 0;
      var answeredCurrent = state.answered[state.current] !== undefined;
      nextBtn.textContent = state.current === questions.length - 1 ? 'See results' : (answeredCurrent ? 'Next question' : 'Check answer');
      nextBtn.disabled = !answeredCurrent;
      progressFillEl.style.width = (((state.current) / questions.length) * 100) + '%';
      scoreEl.textContent = state.score;
    }

    function selectOption(qi, oi){
      if(state.answered[qi] !== undefined) return;
      var block = blocks[qi];
      var q = questions[qi];
      var isCorrect = oi === q.correct;
      state.answered[qi] = oi;
      if(isCorrect) state.score++;

      block.querySelectorAll('.q-option').forEach(function(btn){
        var boi = parseInt(btn.getAttribute('data-oi'), 10);
        btn.disabled = true;
        if(boi === q.correct){ btn.classList.add('correct'); btn.querySelector('.mark').textContent = '✓'; }
        else if(boi === oi){ btn.classList.add('incorrect'); btn.querySelector('.mark').textContent = '✗'; }
      });

      var fb = block.querySelector('[data-feedback]');
      fb.classList.add('show');
      fb.classList.toggle('right', isCorrect);
      fb.classList.toggle('wrong', !isCorrect);
      block.querySelector('[data-verdict]').textContent = isCorrect ? 'Correct!' : 'Not quite.';
      block.querySelector('[data-explain]').textContent = q.explain;

      scoreEl.textContent = state.score;
      render();
    }

    qHost.addEventListener('click', function(e){
      var btn = e.target.closest('.q-option');
      if(!btn) return;
      var block = btn.closest('.q-block');
      var qi = parseInt(block.getAttribute('data-qindex'), 10);
      var oi = parseInt(btn.getAttribute('data-oi'), 10);
      selectOption(qi, oi);
    });

    prevBtn.addEventListener('click', function(){
      if(state.current > 0){ state.current--; render(); }
    });

    nextBtn.addEventListener('click', function(){
      if(state.answered[state.current] === undefined) return;
      if(state.current < questions.length - 1){
        state.current++;
        render();
      } else {
        showResult();
      }
    });

    function showResult(){
      navControls.style.display = 'none';
      resultEl.classList.add('show');
      finalScoreEl.textContent = state.score;
      var pct = state.score / questions.length;
      var msg;
      if(pct === 1) msg = 'Perfect score — you\u2019ve got this down.';
      else if(pct >= 0.7) msg = 'Solid work — a quick re-read of the missed ones will lock it in.';
      else msg = 'Worth a re-read of the notes above, then try again.';
      finalMsgEl.textContent = msg;
      progressFillEl.style.width = '100%';
    }

    retryBtn.addEventListener('click', function(){
      state = { current: 0, answered: [], score: 0 };
      qHost.querySelectorAll('.q-option').forEach(function(btn){
        btn.disabled = false;
        btn.classList.remove('correct','incorrect');
        var m = btn.querySelector('.mark'); if(m) m.textContent = '';
      });
      qHost.querySelectorAll('[data-feedback]').forEach(function(fb){
        fb.classList.remove('show','right','wrong');
      });
      navControls.style.display = 'flex';
      resultEl.classList.remove('show');
      scoreEl.textContent = '0';
      render();
    });

    render();
  }

  document.querySelectorAll('[data-quiz]').forEach(initQuiz);

})();
