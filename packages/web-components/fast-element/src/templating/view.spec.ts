import { expect } from "chai";
import type { Behavior } from "../observation/behavior";
import { defaultExecutionContext } from "../observation/observable";
import { toHTML } from "../__test__/helpers";
import { HTMLView } from "./view";

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

    function createLocation(): { parent: HTMLDivElement; location: Comment } {
        const parent = document.createElement("div");
        const location = document.createComment("");

        parent.appendChild(location);

        return { parent, location };
    }

    function createMockBehavior(): Behavior & {
        bindCalls: { source: unknown; context: unknown }[];
        unbindCalls: unknown[];
    } {
        return {
            bindCalls: [],
            unbindCalls: [],
            bind(source: unknown, context: unknown) {
                this.bindCalls.push({ source, context });
            },
            unbind(source: unknown) {
                this.unbindCalls.push(source);
            },
        };
    }

    context("upon construction", () => {
        it("sets firstChild from the fragment", () => {
            const first = document.createElement("span");
            const last = document.createElement("div");
            const view = createView([first, last]);

            expect(view.firstChild).to.equal(first);
        });

        it("sets lastChild from the fragment", () => {
            const first = document.createElement("span");
            const last = document.createElement("div");
            const view = createView([first, last]);

            expect(view.lastChild).to.equal(last);
        });

        it("sets firstChild and lastChild to the same node for single-node fragments", () => {
            const node = document.createElement("span");
            const view = createView([node]);

            expect(view.firstChild).to.equal(node);
            expect(view.lastChild).to.equal(node);
        });

        it("initializes source to null", () => {
            const view = createView([document.createElement("span")]);
            expect(view.source).to.equal(null);
        });

        it("initializes context to null", () => {
            const view = createView([document.createElement("span")]);
            expect(view.context).to.equal(null);
        });
    });

    context("when appending to a node", () => {
        it("appends all fragment nodes to the target", () => {
            const { parent } = createLocation();
            const view = createView([
                document.createElement("a"),
                document.createElement("b"),
            ]);

            view.appendTo(parent);

            expect(toHTML(parent)).to.contain("<a></a><b></b>");
        });

        it("appends after existing children", () => {
            const parent = document.createElement("div");
            parent.appendChild(document.createElement("p"));

            const view = createView([document.createElement("span")]);
            view.appendTo(parent);

            expect(toHTML(parent)).to.equal("<p></p><span></span>");
        });
    });

    context("when inserting before a reference node", () => {
        it("inserts fragment contents before the reference", () => {
            const { parent, location } = createLocation();
            const view = createView([document.createElement("span")]);

            view.insertBefore(location);

            expect(toHTML(parent)).to.equal("<span></span>");
        });

        it("inserts multiple nodes before the reference", () => {
            const { parent, location } = createLocation();
            const view = createView([
                document.createElement("a"),
                document.createElement("b"),
            ]);

            view.insertBefore(location);

            expect(toHTML(parent)).to.equal("<a></a><b></b>");
        });

        it("does not throw when the reference node has no parent", () => {
            const detached = document.createComment("detached");
            const view = createView([document.createElement("span")]);

            expect(() => view.insertBefore(detached)).not.to.throw();
        });

        it("is a no-op when the reference node has no parent", () => {
            const detached = document.createComment("detached");
            const span = document.createElement("span");
            const view = createView([span]);

            view.insertBefore(detached);

            expect(span.parentNode).not.to.equal(detached.parentNode);
        });

        it("repositions already-inserted nodes when called with a different reference", () => {
            const { parent, location } = createLocation();
            const span = document.createElement("span");
            const end = document.createComment("end");
            const view = createView([span, end]);

            view.insertBefore(location);

            const newLocation = document.createComment("new");
            parent.appendChild(newLocation);

            view.insertBefore(newLocation);

            expect(toHTML(parent, true)).to.contain(
                "<span></span><!--end--><!--new-->"
            );
        });

        it("is a no-op when view nodes are already immediately before the reference", () => {
            const { parent, location } = createLocation();
            const span = document.createElement("span");
            const end = document.createComment("end");
            const view = createView([span, end]);

            view.insertBefore(location);

            const htmlBefore = toHTML(parent, true);
            view.insertBefore(location);
            const htmlAfter = toHTML(parent, true);

            expect(htmlAfter).to.equal(htmlBefore);
        });

        it("does not throw when repositioning to a detached reference node", () => {
            const { location } = createLocation();
            const span = document.createElement("span");
            const end = document.createComment("end");
            const view = createView([span, end]);

            // First insert attaches nodes to the DOM (drains the fragment)
            view.insertBefore(location);

            // Detached reference — triggers else branch with null parentNode
            const detached = document.createComment("detached");
            expect(() => view.insertBefore(detached)).not.to.throw();
        });

        it("leaves nodes in their original location when repositioning to a detached reference", () => {
            const { parent, location } = createLocation();
            const span = document.createElement("span");
            const end = document.createComment("end");
            const view = createView([span, end]);

            view.insertBefore(location);
            const htmlBefore = toHTML(parent, true);

            // Detached reference — else branch should be a no-op
            const detached = document.createComment("detached");
            view.insertBefore(detached);

            expect(toHTML(parent, true)).to.equal(htmlBefore);
        });
    });

    context("when removing", () => {
        it("moves all view nodes out of the DOM", () => {
            const { parent, location } = createLocation();
            const view = createView([
                document.createElement("span"),
                document.createComment("end"),
            ]);

            view.insertBefore(location);
            view.remove();

            expect(toHTML(parent)).to.equal("");
        });

        it("leaves other sibling nodes intact", () => {
            const parent = document.createElement("div");
            parent.appendChild(document.createElement("p"));
            const location = document.createComment("");
            parent.appendChild(location);

            const view = createView([
                document.createElement("span"),
                document.createComment("end"),
            ]);

            view.insertBefore(location);
            view.remove();

            expect(toHTML(parent)).to.equal("<p></p>");
        });

        it("allows re-insertion after removal", () => {
            const { parent, location } = createLocation();
            const view = createView([
                document.createElement("span"),
                document.createComment(""),
            ]);

            view.insertBefore(location);
            view.remove();
            view.insertBefore(location);

            expect(toHTML(parent)).to.equal("<span></span>");
        });
    });

    context("when disposing", () => {
        it("removes all view nodes from the DOM", () => {
            const { parent, location } = createLocation();
            const view = createView([
                document.createElement("span"),
                document.createComment("end"),
            ]);

            view.insertBefore(location);
            view.dispose();

            expect(toHTML(parent)).to.equal("");
        });

        it("leaves other sibling nodes intact", () => {
            const parent = document.createElement("div");
            parent.appendChild(document.createElement("p"));
            const location = document.createComment("");
            parent.appendChild(location);

            const view = createView([
                document.createElement("span"),
                document.createComment("end"),
            ]);

            view.insertBefore(location);
            view.dispose();

            expect(toHTML(parent)).to.equal("<p></p>");
        });

        it("unbinds all behaviors", () => {
            const { location } = createLocation();
            const b1 = createMockBehavior();
            const b2 = createMockBehavior();
            const view = createView(
                [document.createElement("span"), document.createComment("end")],
                [b1, b2]
            );
            const source = { value: 1 };

            view.bind(source, defaultExecutionContext);
            view.insertBefore(location);
            view.dispose();

            expect(b1.unbindCalls).to.have.lengthOf(1);
            expect(b1.unbindCalls[0]).to.equal(source);
            expect(b2.unbindCalls).to.have.lengthOf(1);
            expect(b2.unbindCalls[0]).to.equal(source);
        });
    });

    context("when binding", () => {
        it("sets source and context", () => {
            const view = createView([document.createElement("span")]);
            const source = { value: 1 };

            view.bind(source, defaultExecutionContext);

            expect(view.source).to.equal(source);
            expect(view.context).to.equal(defaultExecutionContext);
        });

        it("binds all behaviors to the source and context", () => {
            const b1 = createMockBehavior();
            const b2 = createMockBehavior();
            const view = createView(
                [document.createElement("span")],
                [b1, b2]
            );
            const source = { value: 1 };

            view.bind(source, defaultExecutionContext);

            expect(b1.bindCalls).to.have.lengthOf(1);
            expect(b1.bindCalls[0]!.source).to.equal(source);
            expect(b1.bindCalls[0]!.context).to.equal(defaultExecutionContext);
            expect(b2.bindCalls).to.have.lengthOf(1);
        });

        it("is a no-op when binding to the same source", () => {
            const b1 = createMockBehavior();
            const view = createView(
                [document.createElement("span")],
                [b1]
            );
            const source = { value: 1 };

            view.bind(source, defaultExecutionContext);
            view.bind(source, defaultExecutionContext);

            expect(b1.bindCalls).to.have.lengthOf(1);
        });

        it("unbinds the old source and binds the new source when source changes", () => {
            const b1 = createMockBehavior();
            const view = createView(
                [document.createElement("span")],
                [b1]
            );
            const source1 = { value: 1 };
            const source2 = { value: 2 };

            view.bind(source1, defaultExecutionContext);
            view.bind(source2, defaultExecutionContext);

            expect(b1.unbindCalls).to.have.lengthOf(1);
            expect(b1.unbindCalls[0]).to.equal(source1);
            expect(b1.bindCalls).to.have.lengthOf(2);
            expect(b1.bindCalls[1]!.source).to.equal(source2);
        });

        it("updates source when rebinding to a different source", () => {
            const view = createView([document.createElement("span")]);

            view.bind({ value: 1 }, defaultExecutionContext);
            const newSource = { value: 2 };
            view.bind(newSource, defaultExecutionContext);

            expect(view.source).to.equal(newSource);
        });
    });

    context("when unbinding", () => {
        it("unbinds all behaviors from the source", () => {
            const b1 = createMockBehavior();
            const b2 = createMockBehavior();
            const view = createView(
                [document.createElement("span")],
                [b1, b2]
            );
            const source = { value: 1 };

            view.bind(source, defaultExecutionContext);
            view.unbind();

            expect(b1.unbindCalls).to.have.lengthOf(1);
            expect(b1.unbindCalls[0]).to.equal(source);
            expect(b2.unbindCalls).to.have.lengthOf(1);
            expect(b2.unbindCalls[0]).to.equal(source);
        });

        it("sets source to null", () => {
            const view = createView([document.createElement("span")]);

            view.bind({ value: 1 }, defaultExecutionContext);
            view.unbind();

            expect(view.source).to.equal(null);
        });

        it("is a no-op when source is already null", () => {
            const b1 = createMockBehavior();
            const view = createView(
                [document.createElement("span")],
                [b1]
            );

            view.unbind();

            expect(b1.unbindCalls).to.have.lengthOf(0);
        });

        it("allows rebinding after unbind", () => {
            const b1 = createMockBehavior();
            const view = createView(
                [document.createElement("span")],
                [b1]
            );
            const source1 = { value: 1 };
            const source2 = { value: 2 };

            view.bind(source1, defaultExecutionContext);
            view.unbind();
            view.bind(source2, defaultExecutionContext);

            expect(b1.bindCalls).to.have.lengthOf(2);
            expect(b1.bindCalls[1]!.source).to.equal(source2);
        });
    });

    context("when disposing a contiguous batch", () => {
        it("is a no-op for an empty array", () => {
            expect(() => HTMLView.disposeContiguousBatch([])).not.to.throw();
        });

        it("removes all nodes from a single view", () => {
            const { parent, location } = createLocation();
            const view = createView([
                document.createElement("span"),
                document.createComment("end"),
            ]);

            view.insertBefore(location);

            HTMLView.disposeContiguousBatch([view]);

            expect(toHTML(parent)).to.equal("");
        });

        it("removes all nodes from multiple contiguous views", () => {
            const { parent, location } = createLocation();
            const view1 = createView([
                document.createElement("a"),
                document.createComment("e1"),
            ]);
            const view2 = createView([
                document.createElement("b"),
                document.createComment("e2"),
            ]);

            view1.insertBefore(location);
            view2.insertBefore(location);

            HTMLView.disposeContiguousBatch([view1, view2]);

            expect(toHTML(parent)).to.equal("");
        });

        it("leaves non-contiguous sibling nodes intact", () => {
            const parent = document.createElement("div");
            parent.appendChild(document.createElement("p"));
            const location = document.createComment("");
            parent.appendChild(location);

            const view = createView([
                document.createElement("span"),
                document.createComment("end"),
            ]);

            view.insertBefore(location);

            HTMLView.disposeContiguousBatch([view]);

            expect(toHTML(parent)).to.equal("<p></p>");
        });

        it("unbinds all behaviors from all views", () => {
            const { location } = createLocation();

            const b1 = createMockBehavior();
            const source1 = { v: 1 };
            const view1 = createView(
                [document.createElement("a"), document.createComment("e1")],
                [b1]
            );
            view1.bind(source1, defaultExecutionContext);
            view1.insertBefore(location);

            const b2 = createMockBehavior();
            const source2 = { v: 2 };
            const view2 = createView(
                [document.createElement("b"), document.createComment("e2")],
                [b2]
            );
            view2.bind(source2, defaultExecutionContext);
            view2.insertBefore(location);

            HTMLView.disposeContiguousBatch([view1, view2]);

            expect(b1.unbindCalls).to.have.lengthOf(1);
            expect(b1.unbindCalls[0]).to.equal(source1);
            expect(b2.unbindCalls).to.have.lengthOf(1);
            expect(b2.unbindCalls[0]).to.equal(source2);
        });
    });
});
