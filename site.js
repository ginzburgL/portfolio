(function(){
  "use strict";
  var yearEl = document.getElementById('year');
  if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // scroll progress bar
  var progress = document.getElementById('progress');
  var ticking = false;
  function updateProgress(){
    var h = document.documentElement;
    var scrollable = h.scrollHeight - h.clientHeight;
    var pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
    if(progress){ progress.style.width = pct + '%'; }
    ticking = false;
  }
  if(progress){
    window.addEventListener('scroll', function(){
      if(!ticking){ window.requestAnimationFrame(updateProgress); ticking = true; }
    }, { passive:true });
    updateProgress();
  }

  // reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry, i){
        if(entry.isIntersecting){
          entry.target.style.transitionDelay = (i % 4) * 60 + 'ms';
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.15, rootMargin:'0px 0px -40px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  // project overlay — click a card to open its case study full-page, above the current view
  var overlay = document.getElementById('projectOverlay');
  var overlayContent = document.getElementById('overlayContent');
  var overlayBack = document.getElementById('overlayBack');

  if(overlay && overlayContent && overlayBack){
    var lastTrigger = null;
    var PROJECT_RE = /^project-\d+\.html$/;

    function wireInternalLinks(scope){
      scope.querySelectorAll('a[href]').forEach(function(a){
        var href = a.getAttribute('href');
        if(!href) return;
        if(PROJECT_RE.test(href)){
          a.addEventListener('click', function(e){
            e.preventDefault();
            goToProject(href, null);
          });
        } else if(href === 'index.html#work' || href === '#work' || href === 'index.html'){
          a.addEventListener('click', function(e){
            e.preventDefault();
            closeOverlay();
          });
        }
      });
    }

    function renderProject(url){
      overlayContent.setAttribute('aria-busy', 'true');
      fetch(url)
        .then(function(res){
          if(!res.ok){ throw new Error('Failed to load ' + url); }
          return res.text();
        })
        .then(function(html){
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var main = doc.querySelector('main');
          overlayContent.innerHTML = main ? main.innerHTML : html;
          overlayContent.querySelectorAll('.reveal').forEach(function(el){
            el.classList.add('is-visible');
          });
          wireInternalLinks(overlayContent);
          overlayContent.removeAttribute('aria-busy');
          overlay.scrollTop = 0;
        })
        .catch(function(){
          // fetch can't reach the page (e.g. no network) — fall back to a real navigation
          window.location.href = url;
        });
    }

    function goToProject(url, triggerEl){
      lastTrigger = triggerEl || lastTrigger;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('overlay-open');
      history.pushState({ overlayProject: url }, '', '#' + url.replace(/\.html$/, ''));
      renderProject(url);
      overlayBack.focus();
    }

    function closeOverlay(){
      if(overlay.hidden) return;
      overlay.hidden = true;
      overlayContent.innerHTML = '';
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
      if(history.state && history.state.overlayProject){ history.back(); }
      if(lastTrigger){ lastTrigger.focus(); }
    }

    document.querySelectorAll('[data-project]').forEach(function(card){
      card.addEventListener('click', function(){ goToProject(card.dataset.project, card); });
      card.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          goToProject(card.dataset.project, card);
        }
      });
    });

    overlayBack.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !overlay.hidden){ closeOverlay(); }
    });
    window.addEventListener('popstate', function(e){
      if(e.state && e.state.overlayProject){
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('overlay-open');
        renderProject(e.state.overlayProject);
      } else if(!overlay.hidden){
        overlay.hidden = true;
        overlayContent.innerHTML = '';
        document.body.style.overflow = '';
        document.body.classList.remove('overlay-open');
      }
    });

    // deep link / reload support — e.g. arriving on #project-02
    var hashMatch = /^#(project-\d+)$/.exec(location.hash);
    if(hashMatch){
      history.replaceState({ overlayProject: hashMatch[1] + '.html' }, '', location.hash);
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('overlay-open');
      renderProject(hashMatch[1] + '.html');
    }
  }
})();
