# Uncle.js
Uncle is a tiny (1.3k minzipped) virtual DOM library. Ya know React, right?

What's different:
* Should be easy to understand because of it's small code base
* HTML templates - no JSX
* Templates can be precompiled for production (easy, TBD)

[Live Demo](http://jsfiddle.net/asrsrqhr/) on JSFiddle

## Example
```javascript
var TodoApp = {
  items: [
    {text: 'Buy milk', complete: false},
    {text: 'Rob a bank', complete: true}
  ],
  toggle: function(index) {
    this.items[index].complete = !this.items[index].complete;
    this.update();
  },
  // render each item in context of TodoApp
  render: uncle.render('<ul class="todo">{{ this.items.map(TodoItem, this)  }}</ul>'), 
  // mount our UL as a child of BODY
  update: uncle.update(document.body) 
};

var TodoItem = uncle.render('<li class="todo-{{complete? 'complete' : 'active'}}" onclick="this.toggle($index)">{{text}}<li>');

TodoApp.update();
```
## Templates
Use double curly braces (mustaches) to embed Javascript one-liners.
```html
<li class="todo-{{complete? 'complete' : 'active'}}">
  Item #{{$index}}: {{text}}
<li>
```
Special attributes (or "directives"):
* `key="unique{{id}}"` - enables efficient reuse of DOM elements (as seen in React and other libraries)
* `onclick="this.method(event, arg1)"` - DOM 1 event listeners where `this` is your render context (not a DOM element)
* `html="raw  {{html}}"` - same as `innerHTML`

## API
### uncle.render(html)
Converts your template to a Javascript function, which renders virtual DOM.
```javascript
var HelloMessage = {
  name: "Mr. Spock",
  render: uncle.render("<div>Hello {{ this.name }}</div>")
};
// HelloMessage.render() == {tag: "div", attrs:{}, children:[ "Hello ", HelloMessage.name ]}
```
Resulting function accepts two *optional* arguments: `render(some_value, index)`.
This can be used with native Array methods like `Array#map()`. In template's context both arguments are avaliable as `$value` and `$index` accordingly. If `some_value` is an object, it's properties are made avaliable as regular variables for convenience.

### uncle.update(containerElement)
Allows any "renderable" component to update the real DOM. When you call `HelloMessage.update()`, it runs `this.render()`, computes a diff between two virtual DOMs and patches the real one if needed.
```javascript
HelloMessage.update = uncle.update(document.body);
HelloMessage.update(); 
// OR
var updateBody = uncle.update(document.body).bind(HelloMessage);
updateBody();
```
One can call `update()` on-demand or put it in a RAF loop like this:
```javascript
function updateDOM() {
   HelloMessage.update();
   window.requestAnimationFrame(updateDOM);
}
updateDOM();
```

