import chai, { expect } from "chai";
import spies from "chai-spies";
import { AnchoredRegion, anchoredRegionTemplate as template } from "./index";
import { fixture } from "../test-utilities/fixture";
import { DOM } from "@ni/fast-element";

chai.use(spies);

const FASTAnchoredRegion = AnchoredRegion.compose({
    baseName: "anchored-region",
    template
})

async function setup(parentElement?: HTMLElement) {
    const { element, connect, disconnect, parent } = await fixture(FASTAnchoredRegion(), { parent: parentElement });

    const button = document.createElement("button");
    const content = document.createElement("div");

    button.id = "anchor";
    button.setAttribute("style", "width: 100px; height: 100px;");

    content.id = "content";
    content.setAttribute("style", "width: 100px; height: 100px;");

    parent.id = "viewport";
    parent.setAttribute("style", "width: 1000px; height: 1000px;");
    parent.insertBefore(button, element);

    element.appendChild(content);
    element.setAttribute("viewport", "viewport");
    element.setAttribute("anchor", "anchor");
    element.setAttribute("auto-update-mode", "auto");
    element.id = "region";

    return { element, connect, disconnect, content };
}

describe("Anchored Region", () => {
    afterEach(() => chai.spy.restore());

    it("should set positioning modes to 'uncontrolled' by default", async () => {
        const { element, connect, disconnect } = await setup();

        await connect();

        expect(element.verticalPositioningMode).to.equal("uncontrolled");
        expect(element.horizontalPositioningMode).to.equal("uncontrolled");

        await disconnect();
    });

    it("should assign anchor and viewport elements by id", async () => {
        const { element, connect, disconnect } = await setup();

        await connect();
        await DOM.nextUpdate();

        expect(element.anchorElement?.id).to.equal("anchor");
        expect(element.viewportElement?.id).to.equal("viewport");

        await disconnect();
    });

    it("should be sized to match content by default", async () => {
        const { element, connect, disconnect, content } = await setup();

        await connect();
        await DOM.nextUpdate();

        expect(element.clientHeight).to.equal(content.clientHeight);
        expect(element.clientWidth).to.equal(content.clientWidth);

        await disconnect();
    });

    interface ScrollListenerTestOptions {
        createParent: () => HTMLElement,
        show: (parent: HTMLElement) => void,
        hide: (parent: HTMLElement) => void,
        expectListensOnParent: boolean
    }

    async function scrollListenerTest({ createParent, show, hide, expectListensOnParent }: ScrollListenerTestOptions) {
        const parent = createParent();
        const { element, connect, disconnect } = await setup(parent);

        // We will re-attach the anchored region after displaying the parent.
        element.remove();

        const parentAddListenerSpy = chai.spy.on(parent, "addEventListener");
        const parentRemoveListenerSpy = chai.spy.on(parent, "removeEventListener");
        const windowAddListenerSpy = chai.spy.on(window, "addEventListener");
        const windowRemoveListenerSpy = chai.spy.on(window, "removeEventListener");

        await connect();
        show(parent);
        parent.appendChild(element);
        hide(parent);
        await disconnect();

        const expectedAddSpy = expectListensOnParent ? parentAddListenerSpy : windowAddListenerSpy;
        const expectedRemoveSpy = expectListensOnParent ? parentRemoveListenerSpy : windowRemoveListenerSpy;
        const notExpectedAddSpy = expectListensOnParent ? windowAddListenerSpy : parentAddListenerSpy;
        const notExpectedRemoveSpy = expectListensOnParent ? windowRemoveListenerSpy : parentRemoveListenerSpy;

        expect(notExpectedRemoveSpy).not.to.have.been.called.with("scroll");
        expect(notExpectedAddSpy).not.to.have.been.called.with("scroll");
        expect(expectedAddSpy).to.have.been.called.with("scroll");
        expect(expectedRemoveSpy).to.have.been.called.with("scroll");
    }

    it("should attach/detach scroll listener to ancestor modal dialog instead of window", async () => {
        await scrollListenerTest({
            createParent: () => document.createElement("dialog"),
            show: (dialog: HTMLDialogElement) => dialog.showModal(),
            hide: (dialog: HTMLDialogElement) => dialog.close(),
            expectListensOnParent: true
        });
    });

    it("should attach scroll listener to window when ancestor dialog is not modal", async () => {
        await scrollListenerTest({
            createParent: () => document.createElement("dialog"),
            show: (dialog: HTMLDialogElement) => dialog.show(),
            hide: (dialog: HTMLDialogElement) => dialog.close(),
            expectListensOnParent: false
        });
    });

    it("should attach/detach scroll listener to ancestor open popover instead of window", async () => {
        await scrollListenerTest({
            createParent: () => {
                const div = document.createElement("div");
                div.setAttribute("popover", "");
                return div;
            },
            show: (element) => element.showPopover(),
            hide: (element) => element.hidePopover(),
            expectListensOnParent: true
        });
    });

    it("should attach/detach scroll listener to ancestor fullscreen element instead of window", async () => {
        await scrollListenerTest({
            createParent: () => document.createElement("div"),
            show: (element) => {
                Object.defineProperty(document, "fullscreenElement", {
                    get: () => element,
                    configurable: true,
                });
            },
            hide: () => {
                Object.defineProperty(document, "fullscreenElement", {
                    get: () => null,
                    configurable: true,
                });
            },
            expectListensOnParent: true
        });
    });

    async function topLayerTransitionTest(startInTopLayer: boolean) {
        const dialog = document.createElement("dialog");
        const { element, connect, disconnect } = await setup(dialog);

        if (startInTopLayer) {
            element.remove();
            await connect();
            dialog.showModal();
            dialog.appendChild(element);
        } else {
            await connect();
        }

        const dialogAddListenerSpy = chai.spy.on(dialog, "addEventListener");
        const dialogRemoveListenerSpy = chai.spy.on(dialog, "removeEventListener");
        const windowAddListenerSpy = chai.spy.on(window, "addEventListener");
        const windowRemoveListenerSpy = chai.spy.on(window, "removeEventListener");

        if (startInTopLayer) {
            // Move out of top layer
            dialog.close();
        } else {
            // Move into top layer
            dialog.showModal();
        }
        await DOM.nextUpdate();

        const expectedRemoveSpy = startInTopLayer ? dialogRemoveListenerSpy : windowRemoveListenerSpy;
        const expectedAddSpy = startInTopLayer ? windowAddListenerSpy : dialogAddListenerSpy;
        const notExpectedAddSpy = startInTopLayer ? dialogAddListenerSpy : windowAddListenerSpy;
        const notExpectedRemoveSpy = startInTopLayer ? windowRemoveListenerSpy : dialogRemoveListenerSpy;

        expect(notExpectedRemoveSpy).not.to.have.been.called.with("scroll");
        expect(notExpectedAddSpy).not.to.have.been.called.with("scroll");
        expect(expectedRemoveSpy).to.have.been.called.with("scroll");
        expect(expectedAddSpy).to.have.been.called.with("scroll");

        dialog.close();
        await disconnect();
    }

    it("should move scroll listener to dialog when it enters the top layer", async () => {
        await topLayerTransitionTest(false);
    });

    it("should move scroll listener to window when dialog leaves the top layer", async () => {
        await topLayerTransitionTest(true);
    });
});
