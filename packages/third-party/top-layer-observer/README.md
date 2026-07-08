# top layer observer

The `top-layer-observer` tracks the content of the top layer; it offers web developers the means to...
1. check at any time which elements are displayed in the top layer, in what order, and which web platform mechanism promoted each of them into the top layer (_modal dialog_, _popover_, _fullscreen_, _customized select dropdown_)
2. register a callback that is called when top layer content is added or removed

```js
import { TopLayerObserver } from 'top-layer-observer'

const printTopLayerStats = (currentTopLayerStack) => {
  if (currentTopLayerStack.length === 0) {
    console.log("The top layer is empty.");
  } else {
    console.log(`There are currently ${currentTopLayerStack.length} different entries in the top layer`);
    const topEntry = currentTopLayerStack.at(-1);
    console.log(`The top-most entry was caused by: ${topEntry.cause}`);
    console.log("The corresponding element is:");
    console.log(topEntry.element);
  }
};

printTopLayerStats(TopLayerObserver.currentTopLayerStack);

const observer = new TopLayerObserver((observation, observer) => {
  console.log("The top layer changed.");
  printTopLayerStats(observation.currentTopLayerStack);
});
observer.observe();
```

## motivation

Having more control over the top layer, or at least a way to know whether a given top layer entry is obscured by other content (and ideally to get notified when this fact changes), is a much requested feature in open WHATWG discussions.
- [API to get top layer elements](https://github.com/whatwg/html/issues/9075)
- [Expose an API to get the top layer element](https://github.com/whatwg/html/issues/8783)
- [Expose a stack of blocking elements](https://github.com/whatwg/html/issues/897)
- [Feature Request: Top Layer Stack Management](https://github.com/whatwg/html/issues/10370)

This package is an attempt to solve the immediate need (albeit in user land, therefore with limitations) and to test whether an API that follows the established _Observer pattern_ is a good fit; it might thereby give new impetus to the WHATWG feature discussion.

## API

The API is modelled on other web platform _Observer_ APIs; the callback is provided as a constructor argument; the observer is started via `.observe()` and stopped via `.disconnect()`.

The package has only one export: the `TopLayerObserver`

```js
import { TopLayerObserver } from 'top-layer-observer'
```

### TopLayerObserver.currentTopLayerStack

```js
TopLayerObserver.currentTopLayerStack
```

Static getter to access the current top layer stack, which is an array of `TopLayerEntry` instances.
The result is identical to the result of the instance accessor of the same name.

### Constructor

```js
new TopLayerObserver(callback)

new TopLayerObserver((observation, observer) => {...})
```

You must provide a callback to the constructor. The callback will be invoked when top layer changes are detected.
The callback will receive two arguments:
- `observation`: a plain object that contains the property `currentTopLayerStack` (which is an array of `TopLayerEntry` instances)
- `observer`: reference to the `TopLayerObserver` instance

### instance.observe()

Call `.observe()` to begin watching for top layer changes.

### instance.disconnect()

Call `.disconnect()` to stop watching for top layer changes. After `disconnect` you can call `observe` again to continue watching for top layer changes.

### instance.currentTopLayerStack

Instance getter to access the current top layer stack, which is an array of `TopLayerEntry` instances.
The result is identical to the result of the static accessor of the same name.

### TopLayerEntry

A `TopLayerEntry` object represents an entry in the current top layer. It has two properties:
- `element`: reference to the corresponding DOM element.
- `cause`: a string that identifies the web platform mechanism that caused the top layer promotion
  `'dialog.modal' | 'fullscreen' | 'popover' | 'select.popover'`

The `TopLayerEntry` object only holds a weak reference to the DOM element, therefore keeping a strong reference to the `TopLayerEntry` object itself does not create any risk for memory leaks, the weak reference is dereferenced when `TopLayerEntry.element` is accessed and returns a strong reference again, so don't hold on to those references longer than needed.

## Capabilities and Limitations

Currently four different ways exist to promote elements to the top layer
- opening a modal `<dialog>`
- opening a `popover`
- requesting `fullscreen`
- opening the picker dropdown of a customized `<select>`

Each of the four mechanisms can concern elements in the regular DOM as well as elements in shadow DOM.
Currently `top-layer-observer` is capable of detecting any top layer content caused by any of those four mechanisms...
- when in the regular DOM
- when in _open_ shadow DOM
...but not when in _closed_ shadow DOM.

## Feedback

Any feedback is welcome; if you encounter any bugs please report them.
