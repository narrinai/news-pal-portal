/**
 * News Pal Universal Embed Script
 *
 * Usage:
 *   <div id="newspal-articles"></div>
 *   <script src="https://newspal.vercel.app/embed/newspal-loader.js"
 *     data-automation-id="recXXX"
 *     data-limit="20"
 *     data-container="newspal-articles"></script>
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var automationId = script.getAttribute('data-automation-id');
  var limit = parseInt(script.getAttribute('data-limit') || '20', 10);
  var containerId = script.getAttribute('data-container') || 'newspal-articles';
  var apiBase = script.getAttribute('data-api-url') || script.src.replace(/\/embed\/newspal-loader\.js.*$/, '');

  if (!automationId) {
    console.error('[NewsPal] Missing data-automation-id attribute');
    return;
  }

  var CACHE_KEY = 'newspal_cache_' + automationId;
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Default card template
  var DEFAULT_TEMPLATE =
    '<article class="newspal-card">' +
    '<div class="newspal-source">{{source}}</div>' +
    '<h3><a href="{{url}}" target="_blank" rel="noopener">{{title}}</a></h3>' +
    '<p>{{description}}</p>' +
    '<div class="newspal-meta">' +
    '<span class="newspal-date">{{date}}</span>' +
    '<span class="newspal-category">{{category}}</span>' +
    '</div>' +
    '</article>';

  function renderTemplate(template, article) {
    var date = '';
    try {
      var d = new Date(article.publishedAt);
      date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      date = article.publishedAt || '';
    }

    return template
      .replace(/\{\{title\}\}/g, escapeHtml(article.title || ''))
      .replace(/\{\{description\}\}/g, escapeHtml(article.description || ''))
      .replace(/\{\{date\}\}/g, escapeHtml(date))
      .replace(/\{\{category\}\}/g, escapeHtml(article.category || ''))
      .replace(/\{\{source\}\}/g, escapeHtml(article.source || ''))
      .replace(/\{\{url\}\}/g, escapeAttr(article.sourceUrl || '#'))
      .replace(/\{\{imageUrl\}\}/g, escapeAttr(article.imageUrl || ''))
      .replace(/\{\{content\}\}/g, article.html || article.content || '');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getCached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > CACHE_TTL) return null;
      return cached;
    } catch (e) {
      return null;
    }
  }

  function setCache(articles, template) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        articles: articles,
        template: template,
        timestamp: Date.now()
      }));
    } catch (e) {
      // localStorage full or unavailable
    }
  }

  function render(articles, template) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.error('[NewsPal] Container #' + containerId + ' not found');
      return;
    }

    var html = '';
    for (var i = 0; i < articles.length; i++) {
      html += renderTemplate(template, articles[i]);
    }
    container.innerHTML = html;

    // Dispatch custom event
    var event;
    try {
      event = new CustomEvent('newspal:loaded', { detail: { count: articles.length, automationId: automationId } });
    } catch (e) {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('newspal:loaded', true, true, { count: articles.length, automationId: automationId });
    }
    container.dispatchEvent(event);
    document.dispatchEvent(event);
  }

  function load() {
    // Try cache first for instant render
    var cached = getCached();
    if (cached && cached.articles) {
      render(cached.articles, cached.template || DEFAULT_TEMPLATE);
    }

    // Fetch articles and template in parallel
    var articlesUrl = apiBase + '/api/articles/public?automation_id=' + encodeURIComponent(automationId) + '&limit=' + limit;
    var statusUrl = apiBase + '/api/articles/status?automation_id=' + encodeURIComponent(automationId);

    Promise.all([
      fetch(articlesUrl).then(function (r) { return r.json(); }),
      fetch(statusUrl).then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (results) {
      var data = results[0];
      var status = results[1];

      if (!data.success || !data.articles) {
        if (!cached) {
          console.error('[NewsPal] Failed to load articles');
        }
        return;
      }

      var template = (status.card_template) || DEFAULT_TEMPLATE;
      render(data.articles, template);
      setCache(data.articles, template);
    }).catch(function (err) {
      console.error('[NewsPal] Fetch error:', err);
      // Cache already rendered above if available
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
