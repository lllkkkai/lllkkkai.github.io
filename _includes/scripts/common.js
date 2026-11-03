(function () {
  var $root = document.getElementsByClassName('root')[0];
  if (window.hasEvent && window.hasEvent('touchstart')) {
    $root.dataset.isTouch = true;
    document.addEventListener('touchstart', function(){}, false);
  }

  // --- 1. Dark/Light Mode Switcher ---
  function updateThemeIcons(theme) {
    var icons = document.querySelectorAll('.theme-toggle-btn .theme-icon');
    icons.forEach(function(icon) {
      if (theme === 'dark') {
        icon.className = 'fas fa-sun theme-icon';
      } else {
        icon.className = 'fas fa-moon theme-icon';
      }
    });
  }

  var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcons(currentTheme);

  document.querySelectorAll('.js-theme-toggle').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var now = document.documentElement.getAttribute('data-theme') || 'light';
      var next = now === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('theme', next);
      } catch(err) {}
      updateThemeIcons(next);
    });
  });

  // --- 2. Reading Progress Bar ---
  var progressBar = document.getElementById('reading-progress-bar');
  if (progressBar) {
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
          progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // --- 3. Modern Code Block Enhancements (Mac Dots & Copy Button) ---
  function enhanceCodeBlocks() {
    var codeBlocks = document.querySelectorAll('.highlighter-rouge, figure.highlight');
    codeBlocks.forEach(function(block) {
      if (block.querySelector('.code-header-bar')) return; // Avoid duplicate

      // Extract language
      var lang = '';
      if (block.dataset && block.dataset.lang) {
        lang = block.dataset.lang;
      } else {
        var classNames = block.className.split(' ');
        for (var i = 0; i < classNames.length; i++) {
          if (classNames[i].indexOf('language-') === 0) {
            lang = classNames[i].replace('language-', '');
            break;
          }
        }
      }
      lang = lang ? lang.toUpperCase() : 'CODE';

      var header = document.createElement('div');
      header.className = 'code-header-bar';
      header.innerHTML = 
        '<div class="code-mac-dots">' +
          '<span class="code-dot code-dot--red"></span>' +
          '<span class="code-dot code-dot--yellow"></span>' +
          '<span class="code-dot code-dot--green"></span>' +
        '</div>' +
        '<div class="code-header-meta">' +
          '<span class="code-lang-label">' + lang + '</span>' +
          '<button type="button" class="code-copy-btn" title="复制代码" aria-label="复制代码">' +
            '<i class="far fa-copy"></i><span class="copy-text">复制</span>' +
          '</button>' +
        '</div>';

      block.insertBefore(header, block.firstChild);

      var copyBtn = header.querySelector('.code-copy-btn');
      var codeElem = block.querySelector('code');

      if (copyBtn && codeElem) {
        copyBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var text = codeElem.innerText || codeElem.textContent;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
              showCopied(copyBtn);
            }).catch(function() {
              fallbackCopy(text, copyBtn);
            });
          } else {
            fallbackCopy(text, copyBtn);
          }
        });
      }
    });

    function showCopied(btn) {
      btn.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i><span class="copy-text" style="color: #10b981;">已复制</span>';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.innerHTML = '<i class="far fa-copy"></i><span class="copy-text">复制</span>';
        btn.classList.remove('copied');
      }, 2000);
    }

    function fallbackCopy(text, btn) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showCopied(btn);
      } catch(e) {}
      document.body.removeChild(textarea);
    }
  }

  // --- 4. GitHub-Style Callout / Alerts ---
  function enhanceCallouts() {
    var blockquotes = document.querySelectorAll('.article__content blockquote');
    var alertTypes = {
      'NOTE': { class: 'callout-note', icon: 'fas fa-info-circle', title: 'Note' },
      'TIP': { class: 'callout-tip', icon: 'far fa-lightbulb', title: 'Tip' },
      'IMPORTANT': { class: 'callout-important', icon: 'fas fa-comment-alt', title: 'Important' },
      'WARNING': { class: 'callout-warning', icon: 'fas fa-exclamation-triangle', title: 'Warning' },
      'CAUTION': { class: 'callout-caution', icon: 'fas fa-exclamation-circle', title: 'Caution' }
    };

    blockquotes.forEach(function(bq) {
      var firstP = bq.querySelector('p');
      if (!firstP) return;
      var text = firstP.innerHTML.trim();
      var match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (match) {
        var type = match[1].toUpperCase();
        var alertInfo = alertTypes[type];
        if (alertInfo) {
          bq.classList.add('callout', alertInfo.class);
          var remainingHtml = text.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\s*\/?>)?/i, '');
          firstP.innerHTML = remainingHtml;
          var titleDiv = document.createElement('div');
          titleDiv.className = 'callout-title';
          titleDiv.innerHTML = '<i class="' + alertInfo.icon + '"></i> ' + alertInfo.title;
          bq.insertBefore(titleDiv, bq.firstChild);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      enhanceCodeBlocks();
      enhanceCallouts();
    });
  } else {
    enhanceCodeBlocks();
    enhanceCallouts();
  }
})();
