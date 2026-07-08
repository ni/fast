import { observeGlobally } from "select-events/core";

class EntryWrapper {
    #weakRef
    #cause

    constructor(weakRef, cause) {
        this.#weakRef = weakRef;
        this.#cause = cause;
    }

    get element() {
        return this.#weakRef.deref();
    }

    get cause() {
        return this.#cause;
    }
}

export const setupWatcher = (onChange) => {
    const popovers = new WeakSet();
    const modalDialogs = new WeakSet();
    const nonModalDialogs = new WeakSet();
    const details = new WeakSet();
    const selectPickerPopovers = new WeakSet();
    const selectPickerNonPopovers = new WeakSet();
    const shadowRoots = new WeakSet();
    let focusScanBookedIn_modalDialogs = new WeakSet();
    let focusScanBookedIn_popovers = new WeakSet();
    const resetFocusScanBookedInRefs = () => {
        focusScanBookedIn_modalDialogs = new WeakSet();
        focusScanBookedIn_popovers = new WeakSet();
    };

    const bookIn = (element, cause) => {
        switch (cause) {
            case 'popover':
                popovers.add(element);
                break;
            case 'dialog.modal':
                modalDialogs.add(element);
                break;
            case 'dialog.default':
                nonModalDialogs.add(element);
                break;
            case 'details.default':
                details.add(element);
                break;
            case 'fullscreen':
                // do nothing, we don't need to keep references for this case
                break;
            case 'select.popover':
                selectPickerPopovers.add(element);
                break;
            case 'select.default':
                selectPickerNonPopovers.add(element);
                break;
            default: throw new Error('not implemented');
        }
    }

    const bookOut = (element, cause) => {
        switch (cause) {
            case 'popover':
                popovers.delete(element);
                break;
            case 'dialog.modal':
                modalDialogs.delete(element);
                break;
            case 'dialog.default':
                nonModalDialogs.delete(element);
                break;
            case 'details.default':
                details.delete(element);
                break;
            case 'fullscreen':
                // do nothing, we don't need to keep references for this case
                break;
            case 'select.popover':
                selectPickerPopovers.delete(element);
                break;
            case 'select.default':
                selectPickerNonPopovers.delete(element);
                break;
            default: throw new Error('not implemented');
        }
    }

    const causedByPopoverOpened = (event) =>
        event.newState === 'open' && event.target.matches(':popover-open');
    const causedByPopoverClosed = (event) =>
        event.newState === 'closed' && popovers.has(event.target);


    const causedByModalDialogOpened = (event) =>
        event.newState === 'open' && event.target.tagName === 'DIALOG' && event.target.matches(':modal');
    const causedByModalDialogClosed = (event) =>
        event.newState === 'closed' && event.target.tagName === 'DIALOG' && modalDialogs.has(event.target);


    const causedByNonModalDialogOpened = (event) =>
        event.newState === 'open' && event.target.tagName === 'DIALOG' && !event.target.matches(':modal') && !event.target.matches(':popover-open');
    const causedByNonModalDialogClosed = (event) =>
        event.newState === 'closed' && event.target.tagName === 'DIALOG' && nonModalDialogs.has(event.target);


    const causedByDetailsOpened = (event) =>
        event.newState === 'open' && event.target.tagName === 'DETAILS' && !event.target.matches(':popover-open');
    const causedByDetailsClosed = (event) =>
        event.newState === 'closed' && event.target.tagName === 'DETAILS' && details.has(event.target);


    const causedBySelectPickerPopoverOpened = (element, isBaseSelect, selectOpened) => selectOpened && isBaseSelect;
    const causedBySelectPickerPopoverClosed = (element, isBaseSelect, selectOpened) => !selectOpened && selectPickerPopovers.has(element);

    const causedBySelectPickerLegacyOpened = (element, isBaseSelect, selectOpened) => selectOpened && !isBaseSelect;
    const causedBySelectPickerLegacyClosed = (element, isBaseSelect, selectOpened) => !selectOpened && selectPickerNonPopovers.has(element);

    const currentState = [];
    let currentStateForExternalConsumers = [];
    const updateStateForExternalConsumersAndNotify = () => {
        currentStateForExternalConsumers = Object.freeze(currentState.map((x) => new EntryWrapper(x.ref, x.cause)));
        onChange();
    };

    const handleEnterTopLayer = (target, cause) => {
        const existingEntryIndex = currentState.findIndex(entry => entry.ref.deref() === target);
        if (existingEntryIndex > -1) {
            const existingEntry = currentState[existingEntryIndex];
            currentState.splice(existingEntryIndex, 1);
            bookOut(existingEntry.ref.deref(), existingEntry.cause);
        }
        const newEntry = {
            ref: new WeakRef(target),
            cause,
        }
        currentState.push(newEntry);
        bookIn(target, cause);
        updateStateForExternalConsumersAndNotify();
    };

    const handleExitTopLayer = (target, cause, silent = false) => {
        const existingEntryIndex = currentState.findIndex(entry => entry.ref.deref() === target);
        if (existingEntryIndex === -1) {
            return;
        }
        const existingEntry = currentState[existingEntryIndex];
        currentState.splice(existingEntryIndex, 1);
        bookOut(existingEntry.ref.deref(), existingEntry.cause);
        if (!silent) updateStateForExternalConsumersAndNotify();
    };

    const handleRemoved = (mutationRecords) => {
        const deletedNodes = new Set(mutationRecords.flatMap(mutationRecord => [...mutationRecord.removedNodes]));
        const topLayerNodes = new Set(currentState.map(entry => entry.ref.deref()));
        const deletedTopLayerNodes = topLayerNodes.intersection(deletedNodes);
        deletedTopLayerNodes.forEach((node) => handleExitTopLayer(node, '', true));
        updateStateForExternalConsumersAndNotify();
    };

    const deletedNodesObserver = new MutationObserver(handleRemoved);
    deletedNodesObserver.observe(document, { childList: true, subtree: true });

    const abortController = new AbortController();

    const toggleEventHandler = (event) => {
        if (causedByPopoverOpened(event)) {
            if (!focusScanBookedIn_popovers.has(event.target)) handleEnterTopLayer(event.target, 'popover');
        } else if (causedByPopoverClosed(event)) {
            handleExitTopLayer(event.target, 'popover');
        } else if (causedByModalDialogOpened(event)) {
            if (!focusScanBookedIn_modalDialogs.has(event.target)) handleEnterTopLayer(event.target, 'dialog.modal');
        } else if (causedByModalDialogClosed(event)) {
            handleExitTopLayer(event.target, 'dialog.modal');
        } else if (causedByNonModalDialogOpened(event)) {
            bookIn(event.target, 'dialog.default');
        } else if (causedByNonModalDialogClosed(event)) {
            bookOut(event.target, 'dialog.default');
        } else if (causedByDetailsOpened(event)) {
            bookIn(event.target, 'details.default');
        } else if (causedByDetailsClosed(event)) {
            bookOut(event.target, 'details.default');
        } else {
            console.warn(`Top-Layer-Observer :: Unhandled Case :: toggle event originated in ${event.target.tagName} from unknown cause.`)
        };
    };

    const watchShadowRoot = (shadowRoot) => {
        if (!shadowRoots.has(shadowRoot)) {
            shadowRoots.add(shadowRoot);
            shadowRoot.addEventListener('toggle', toggleEventHandler, { capture: true, signal: abortController.signal });
        }
    };

    document.addEventListener('toggle', toggleEventHandler, { capture: true, signal: abortController.signal });

    // we need a focus listener because 'toggle' events are not composed (that's a real bummer),
    // so in order to not miss dialogs/popovers in shadow DOM we need to listen for focus events
    // and when we thereby discover a shadowRoot we attach a 'toggle' listener for the shadowDOM
    // and scan the shadowDOM for any open dialogs or popups that might have already fired their opening toggle event.
    // As far as I can tell from the observations I made, it seems that the focus event will actually precede the toggle (newState: open) event.
    // But I don't trust that I can rely on that being always the case, and therefore run the scan upon focus.
    document.addEventListener('focus', (event) => {
        if (event.target.shadowRoot) {
            watchShadowRoot(event.target.shadowRoot);
            const untrackedOpenModalDialogs = [];
            const untrackedOpenPopovers = [];
            const findTopLayerCausesInShadowDOM = (rootNode) => {
                // search for open! modal! dialogs! that we have not yet booked in!
                // and that have been opened via .showModal() and not via .requestFullscreen()
                rootNode.querySelectorAll('dialog:modal:not(:fullscreen)').forEach((dialog) => {
                    if (!modalDialogs.has(dialog)) untrackedOpenModalDialogs.push(dialog);
                });
                // search for open! popovers! that we have not yet booked in!
                rootNode.querySelectorAll('[popover]:popover-open').forEach((popover) => {
                    if (!popovers.has(popover)) untrackedOpenPopovers.push(popover);
                });
                rootNode.querySelectorAll('*').forEach((child) => {
                    if (child.shadowRoot) {
                        watchShadowRoot(child.shadowRoot);
                        findTopLayerCausesInShadowDOM(child.shadowRoot);
                    }
                });
            }
            findTopLayerCausesInShadowDOM(event.target.shadowRoot);
            untrackedOpenModalDialogs.forEach((dialog) => {
                focusScanBookedIn_modalDialogs.add(dialog);
                handleEnterTopLayer(dialog, 'dialog.modal');
            });
            untrackedOpenPopovers.forEach((popover) => {
                focusScanBookedIn_popovers.add(popover);
                handleEnterTopLayer(popover, 'popover');
            });
            window.setTimeout(resetFocusScanBookedInRefs);
        }
    }, { capture: true, signal: abortController.signal });

    document.addEventListener('fullscreenchange', (event) => {
        const isEnteringFullscreenMode = document.fullscreenElement !== null;
        if (isEnteringFullscreenMode) {
            handleEnterTopLayer(event.target, 'fullscreen');
        } else {
            handleExitTopLayer(event.target, 'fullscreen');
        }
    }, { capture: true, signal: abortController.signal });

    const { disconnect: stopPickerObserver } = observeGlobally((element, selectOpened) => {
        const selectStyle = window.getComputedStyle(element);
        const pickerStyle = window.getComputedStyle(element, '::picker(select)');
        const isBaseSelect = selectStyle.getPropertyValue('appearance') === 'base-select' && pickerStyle.getPropertyValue('appearance') === 'base-select';

        if (causedBySelectPickerPopoverOpened(element, isBaseSelect, selectOpened)) {
            handleEnterTopLayer(element, 'select.popover');
        } else if (causedBySelectPickerPopoverClosed(element, isBaseSelect, selectOpened)) {
            handleExitTopLayer(element, 'select.popover');
        } else if (causedBySelectPickerLegacyOpened(element, isBaseSelect, selectOpened)) {
            bookIn(element, 'select.default');
        } else if (causedBySelectPickerLegacyClosed(element, isBaseSelect, selectOpened)) {
            bookOut(element, 'select.default');
        } else {
            console.warn(`Top-Layer-Observer :: Unhandled Case :: select picker opening/closing :: neither 'select.popover' nor 'select.default'`)
        };
    });

    const shutdown = () => {
        deletedNodesObserver.disconnect();
        abortController.abort();
        stopPickerObserver();
    };

    const getCurrentState = () => currentStateForExternalConsumers;

    return { shutdown, getCurrentState };
}
