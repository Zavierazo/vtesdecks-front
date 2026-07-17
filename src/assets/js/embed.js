;(function () {
  'use strict'
  var script = document.currentScript
  var ORIGIN =
    (script && script.getAttribute('data-origin')) || 'https://vtesdecks.com'
  var frames = []

  function build(node) {
    var id = node.getAttribute('data-deck-id')
    if (!id || node.getAttribute('data-vtesdecks-ready')) {
      return
    }
    node.setAttribute('data-vtesdecks-ready', '1')
    var params = []
    var keys = ['theme', 'sections', 'lang']
    for (var i = 0; i < keys.length; i++) {
      var value = node.getAttribute('data-' + keys[i])
      // Empty values still count: data-sections="" means "header only"
      if (value !== null) {
        params.push(keys[i] + '=' + encodeURIComponent(value))
      }
    }
    var iframe = document.createElement('iframe')
    iframe.src =
      ORIGIN +
      '/deck/' +
      encodeURIComponent(id) +
      '/embed' +
      (params.length ? '?' + params.join('&') : '')
    iframe.title = 'VTES Decks deck ' + id
    iframe.loading = 'lazy'
    iframe.style.cssText = 'border:0;display:block;'
    iframe.style.width = node.getAttribute('data-width') || '100%'
    // data-height fixes the height; without it the widget follows its content
    var fixedHeight = node.getAttribute('data-height')
    if (fixedHeight) {
      iframe.style.height = fixedHeight
    } else {
      iframe.height = '420'
    }
    node.appendChild(iframe)
    frames.push({ iframe: iframe, fixed: !!fixedHeight })
  }

  function scan() {
    var nodes = document.querySelectorAll('.vtesdecks-deck[data-deck-id]')
    for (var i = 0; i < nodes.length; i++) {
      build(nodes[i])
    }
  }

  window.addEventListener('message', function (event) {
    var data = event.data
    if (
      !data ||
      data.type !== 'vtesdecks-embed-resize' ||
      event.origin !== ORIGIN
    ) {
      return
    }
    var height = Math.ceil(data.height)
    if (!(height > 0)) {
      return
    }
    for (var i = 0; i < frames.length; i++) {
      if (!frames[i].fixed && frames[i].iframe.contentWindow === event.source) {
        frames[i].iframe.height = String(height)
      }
    }
  })

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan)
  } else {
    scan()
  }
  window.VTESDecksEmbed = { scan: scan }
})()
