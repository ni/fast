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

async function setup() {
    const { element, connect, disconnect, parent } = await fixture(FASTAnchoredRegion());

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

    it("should attach scroll listeners to ancestor dialog on connect and remove them on disconnect", async () => {
        const dialog = document.createElement("dialog");
        dialog.id = "dialog-viewport";

        const { element, connect, disconnect } = await fixture(FASTAnchoredRegion(), { parent: dialog });

        const button = document.createElement("button");
        button.id = "dialog-anchor";
        dialog.insertBefore(button, element);

        element.setAttribute("anchor", "dialog-anchor");
        element.setAttribute("viewport", "dialog-viewport");
        element.setAttribute("auto-update-mode", "auto");

        const addListenerSpy = chai.spy.on(dialog, "addEventListener");

        await connect();

        expect(addListenerSpy).to.have.been.called.with("scroll");

        chai.spy.restore(dialog, "addEventListener");

        const removeListenerSpy = chai.spy.on(dialog, "removeEventListener");

        await disconnect();

        expect(removeListenerSpy).to.have.been.called.with("scroll");

        chai.spy.restore(dialog, "removeEventListener");
    });
});
