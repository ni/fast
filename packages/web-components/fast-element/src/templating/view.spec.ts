import { expect } from "chai";
import type { Behavior } from "../observation/behavior";
import { HTMLView } from "./view";
import spies from "chai-spies";

chai.use(spies);

describe("The HTMLView", () => {
    function createFragment(...nodes: Node[]): DocumentFragment {
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
            fragment.appendChild(node);
        }
        return fragment;
    }

    function createView(
        nodes: Node[],
        behaviors: Behavior[] = []
    ): HTMLView {
        return new HTMLView(createFragment(...nodes), behaviors);
    }

    it('disposeContiguousBatch disposes all views', () => {
        const viewCount = 10;
        const views: HTMLView[] = [];
        const disposeSpies: ChaiSpies.Spy[] = [];
        for (let i = 0; i < viewCount; i++) {
            const span = document.createElement("span");
            const view = createView([span]);
            views.push(view);
            disposeSpies.push(chai.spy.on(view, "dispose"));
        }

        HTMLView.disposeContiguousBatch(views);

        for (const spy of disposeSpies) {
            expect(spy).to.have.been.called.exactly(1);
        }
    });
});
