import { setupWatcher } from './core.js'

const TOP_LAYER_CHANGE = 'top-layer-change';
const eventEmitter = new EventTarget();
const { shutdown, getCurrentState } = setupWatcher(
  () => eventEmitter.dispatchEvent(new Event(TOP_LAYER_CHANGE))
);

export class TopLayerObserver {

  #callback
  #listener

  static get currentTopLayerStack() {
      return getCurrentState();
  }

  constructor(callback) {
    this.#callback = callback;
    this.#listener = () => {
      callback({ currentTopLayerStack: TopLayerObserver.currentTopLayerStack }, this);
    };
  }

  get currentTopLayerStack() {
      return TopLayerObserver.currentTopLayerStack;
  }

  observe() {
    eventEmitter.addEventListener(TOP_LAYER_CHANGE, this.#listener);
  }

  disconnect() {
    eventEmitter.removeEventListener(TOP_LAYER_CHANGE, this.#listener);
  }
}
