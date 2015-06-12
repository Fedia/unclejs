/*
* Uncle.js is a tiny virtual DOM library
* https://github.com/Fedia/unclejs
* v0.1.0
*/

window.uncle = (function() {

  function vdom(html) {
    var render = Function('_c,$value,$index', 'with(_c)return' + precompile(html));
    return function(val, i) {
      var ctx = typeof val === 'object'? val : {};
      return render.call(this, ctx, val, i)[0];
    };
  }

  function precompile(html) {
    var tagrx = /(<\/?)([\w\-]+)((?:\s+[\w\-]+(?:\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/g,
        voidrx = /^(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i,
        exprx = /{{([^}]+)}}/g;
    var tokens = html.split(tagrx);
    var js = '[', tok = '', tag = null, first_child = true;
    for (var i = 0, l = tokens.length; i < l; i++) {
      tok = tokens[i];
      switch(tok) {
        case '<':
          tag = tokens[++i].toLowerCase();
          js += (first_child? '' : ',') + '{"tag":"' + tag + '","attrs":{' +
            tokens[++i].replace(/\s([^on][\w\-]+)\s*=\s*(?:"(.*?)"|'(.*?)')/g, ',"$1":"$2"').
            replace(/\s(on\w+)\s*=\s*(?:"(.*?)"|'(.*?)')/g, ',"$1":(function(){$2}).bind(this)').
            replace(exprx, '"+($1)+"').substr(1) + '},"children":[].concat(';
          if (voidrx.test(tag)) {
            js += ')}';
          } else {
            first_child = true;
          }
          break;
        case '</':
          js += ')}';
          i += 2;
          first_child = false;
          break;
        default:
          if (tag) {
            js += (first_child? '' : ',') + JSON.stringify(tok).replace(exprx, '",($1),"');
            first_child = false;
          }
      }
    }
    return js + ']';
  }

  function create(vtag) {
    var node;
    vtag = normalize(vtag);
    if (typeof vtag !== 'object') {
      node = document.createTextNode(vtag);
    } else if (vtag.tag) {
      node = document.createElement(vtag.tag);
      for (var attr in vtag.attrs) {
        update_attr(node, attr, vtag.attrs[attr]);
      }
      vtag.children.forEach(function(child) {
        node.appendChild(create(child));
      });
    }
    return node;
  }

  function normalize(vtag) {
    if (vtag && vtag.tag === 'textarea' && !vtag.attrs.hasOwnProperty('value')) {
      vtag.attrs.value = vtag.children.join('');
      vtag.children = [];
    }
    return vtag;
  }

  function update(el, a, b) {
    var atype = typeof a,
        btype = typeof b;
    if (atype !== btype || (btype === 'object' && a && b.tag !== a.tag)) {
      var new_el = create(b);
      el.parentNode.replaceChild(new_el, el);
      el = new_el;
    } else if (btype !== 'object' && b !== a) {
      el.textContent = b;
    } else if (btype === 'object') {
      // same tags
      a = normalize(a);
      b = normalize(b);
      var val, attr;
      for (attr in b.attrs) {
        val = b.attrs[attr];
        if (val !== a.attrs[attr]) {
          update_attr(el, attr, val);
        }
      }
      for (attr in a.attrs) {
        if (!b.attrs.hasOwnProperty(attr)) {
          el.removeAttribute(attr);
        }
      }
      update_children(el, a.children, b.children);
    }
    return el;
  }

  function key_map(children) {
    var map = {};
    children.forEach(function(child, i) {
      map[(child.attrs && child.attrs.hasOwnProperty('key'))? child.attrs.key : '#n' + i] = i;
    });
    return map;
  }

  function update_children(el, achildren, bchildren) {
    var akeypos = key_map(achildren),
        bkeypos = key_map(bchildren),
        bkeys = Object.keys(bkeypos);
    var nodes = Array.prototype.slice.call(el.childNodes),
        trash = nodes.slice(),
        insert = {}, node;
    var k, nk, apos, seqlen = 0;
    for (var i = 0, l = bkeys.length; i < l; i++) {
      k = bkeys[i];
      nk = bkeys[i + 1];
      apos = akeypos[k];
      if (apos === undefined) {
        seqlen = 0;
        insert[i] = create(bchildren[i]);
      } else if (akeypos[nk] - apos === 1 || seqlen) {
        seqlen++;
        update(nodes[apos], achildren[apos], bchildren[i]);
        trash[apos] = null;
      } else {
        seqlen = 0;
        node = update(nodes[apos], achildren[apos], bchildren[i]);
        trash[apos] = null;
        if (apos !== i) {
          insert[i] = node;
        }
      }
    }
    trash.forEach(function(n) {
      if (n) el.removeChild(n);
    });
    for (i in insert) {
      el.insertBefore(insert[i], el.childNodes[i]);
    }
  }

  function update_attr(el, attr, val) {
    if (attr.charAt(0) === 'o') {
      // on* props
      el[attr] = val;
      return;
    }
    switch (attr) {
      case 'class':
        el.className = val;
        break;
      case 'value':
        el.value = val;
        break;
      case 'disabled':
      case 'checked':
        el[attr] = !!val;
        break;
      case 'key':
        break;
      case 'html':
        el.innerHTML = val;
        break;
      default:
        el.setAttribute(attr, val);
    }
  }

  function mount(container) {
    var vdom, el;
    var upd = function(redraw) {
      if (!this.render) throw 'render() not found';
      var new_vdom = this.render();
      var new_el;
      if (el && !redraw) {
        new_el = update(el, vdom, new_vdom);
      } else {
        new_el = create(new_vdom);
        if (el) {
          container.replaceChild(new_el, el);
        } else {
          container.appendChild(new_el);
        }
      }
      if (this.onMount && new_el !== el) {
        this.onMount(new_el);
      }
      upd.vdom = vdom = new_vdom; // make vdom state public
      upd.el = el = new_el; // make dom element public
    };
    return upd; // return update fn
  }

  return {
    render: vdom,
    update: mount,
    createElement: create,
    updateElement: update
  };

})();
