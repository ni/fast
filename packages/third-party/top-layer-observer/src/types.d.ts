export type TopLayerEntryCause = 'dialog.modal' | 'fullscreen' | 'popover' | 'select.popover'

export interface TopLayerEntry {
  readonly element: Element;
  readonly cause: TopLayerEntryCause;
}

export type TopLayerStack = Array<TopLayerEntry>;

export interface TopLayerObservation {
  readonly currentTopLayerStack: TopLayerStack;
}

export interface TopLayerCallback {
  (observation: TopLayerObservation, observer: TopLayerObserver): void;
}

export interface TopLayerObserver {
  readonly currentTopLayerStack: TopLayerStack;
  observe(): void;
  disconnect(): void;
}

declare var TopLayerObserver: {
  prototype: TopLayerObserver;
  new(callback: TopLayerCallback): TopLayerObserver;
  readonly currentTopLayerStack: TopLayerStack;
};
