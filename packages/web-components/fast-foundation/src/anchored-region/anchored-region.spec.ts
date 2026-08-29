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

    describe("scroll event listener", () => {
        let parentAddListenerSpy: any;
        let parentRemoveListenerSpy: any;
        let windowAddListenerSpy: any;
        let windowRemoveListenerSpy: any;

        function setupSpies(parent: HTMLElement) {
            parentAddListenerSpy = chai.spy.on(parent, "addEventListener");
            parentRemoveListenerSpy = chai.spy.on(parent, "removeEventListener");
            windowAddListenerSpy = chai.spy.on(window, "addEventListener");
            windowRemoveListenerSpy = chai.spy.on(window, "removeEventListener");
        }

        function assertListenedOnTopLayerElement() {
            expect(windowRemoveListenerSpy).not.to.have.been.called.with("scroll");
            expect(windowAddListenerSpy).not.to.have.been.called.with("scroll");
            expect(parentAddListenerSpy).to.have.been.called.with("scroll");
            expect(parentRemoveListenerSpy).to.have.been.called.with("scroll");
        }

        function assertListenedOnWindow() {
            expect(parentRemoveListenerSpy).not.to.have.been.called.with("scroll");
            expect(parentAddListenerSpy).not.to.have.been.called.with("scroll");
            expect(windowAddListenerSpy).to.have.been.called.with("scroll");
            expect(windowRemoveListenerSpy).to.have.been.called.with("scroll");
        }

        function assertChangedToListeningOnWindow() {
            expect(windowRemoveListenerSpy).not.to.have.been.called.with("scroll");
            expect(parentAddListenerSpy).not.to.have.been.called.with("scroll");
            expect(parentRemoveListenerSpy).to.have.been.called.with("scroll");
            expect(windowAddListenerSpy).to.have.been.called.with("scroll");
        }

        function assertChangedToListeningOnTopLayerElement() {
            expect(parentRemoveListenerSpy).not.to.have.been.called.with("scroll");
            expect(windowAddListenerSpy).not.to.have.been.called.with("scroll");
            expect(windowRemoveListenerSpy).to.have.been.called.with("scroll");
            expect(parentAddListenerSpy).to.have.been.called.with("scroll");
        }

        async function setupScrollListenerTest(parent: HTMLElement) {
            const { element, connect, disconnect } = await setup(parent);

            // We will re-attach the anchored region after displaying the parent.
            element.remove();
            setupSpies(parent);
            await connect();

            return { region: element, disconnect };
        }

        afterEach(() => chai.spy.restore());

        it("should be on containing modal dialog instead of window", async () => {
            const dialog = document.createElement("dialog");
            const { region, disconnect } = await setupScrollListenerTest(dialog);
            dialog.showModal();

            dialog.appendChild(region); // adds scroll listener
            region.remove(); // removes scroll listener

            dialog.close();
            await disconnect();

            assertListenedOnTopLayerElement();
        });

        it("should be on window when in non-modal dialog", async () => {
            const dialog = document.createElement("dialog");
            const { region, disconnect } = await setupScrollListenerTest(dialog);
            dialog.show();

            dialog.appendChild(region); // adds scroll listener
            region.remove(); // removes scroll listener

            dialog.close();
            await disconnect();

            assertListenedOnWindow();
        });

        it("should be on containing popover element instead of window", async () => {
            const popoverDiv = document.createElement("div");
            popoverDiv.setAttribute("popover", "");
            const { region, disconnect } = await setupScrollListenerTest(popoverDiv);
            popoverDiv.showPopover();

            popoverDiv.appendChild(region); // adds scroll listener
            region.remove(); // removes scroll listener

            popoverDiv.hidePopover();
            await disconnect();

            assertListenedOnTopLayerElement();
        });

        it("should be on containing fullscreen element instead of window", async () => {
            const fullscreenDiv = document.createElement("div");
            const { region, disconnect } = await setupScrollListenerTest(fullscreenDiv);
            Object.defineProperty(document, "fullscreenElement", {
                get: () => fullscreenDiv,
                configurable: true,
            });

            fullscreenDiv.appendChild(region); // adds scroll listener
            region.remove(); // removes scroll listener

            Object.defineProperty(document, "fullscreenElement", {
                get: () => null,
                configurable: true,
            });
            await disconnect();

            assertListenedOnTopLayerElement();
        });

        it("should switch to containing dialog when it is shown as modal", async () => {
            const dialog = document.createElement("dialog");
            const { connect, disconnect } = await setup(dialog);
            await connect();
            setupSpies(dialog);

            // Move into top layer
            dialog.showModal();
            await DOM.nextUpdate();

            assertChangedToListeningOnTopLayerElement();

            dialog.close();
            await disconnect();
        });

        it("should switch to window when containing dialog stops being modal", async () => {
            const dialog = document.createElement("dialog");
            const { element, connect, disconnect } = await setup(dialog);
            element.remove();
            await connect();
            dialog.showModal();
            dialog.appendChild(element);
            setupSpies(dialog);

            // Move out of top layer
            dialog.close();
            await DOM.nextUpdate();

            assertChangedToListeningOnWindow();

            await disconnect();
        });
    });
});
