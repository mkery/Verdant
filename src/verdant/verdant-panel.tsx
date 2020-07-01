import * as React from "react";
import { Widget } from "@lumino/widgets";
import { Checkpoint } from "../lilgit/checkpoint";
import { Nodey } from "../lilgit/nodey/";
import { Store } from "redux";
import { Provider } from "react-redux";
import Panel from "./panel/panel";

/**
 * A widget which displays notebook-level history information
 */
export class VerdantPanel extends React.Component<{ store: Store }> {
  private store: Store;

  constructor(props: { store: Store }) {
    super(props);
    this.store = props.store;
  }

  render() {
    return (
      <Provider store={this.store}>
        <Panel />
      </Provider>
    );
  }

  public ghostBookOpened(widg: Widget) {
    widg.disposed.connect(this.ghostBookClosed.bind(this));
    //this.runList.onGhostBookOpened();
    //let book = (widg as GhostBookPanel).content;
  }

  public ghostBookClosed() {
    //this.runList.onGhostBookClosed();
  }

  /*openGhostBook(notebook: number) {
    this.store.getState().openGhostBook(this.store, notebook);
  }

  openCrumbBox(inspectTarget?: Nodey) {
    this.history.inspector.target = inspectTarget; // TODO lift
    this.store.dispatch(switchTab(ActiveTab.Artifact_Details));
  }*/

  updateCells(
    runNodey: Nodey | Nodey[],
    checkpoint: Checkpoint,
    index?: number,
    indexB?: number
  ) {
    /*ReactDOM.render(
      React.createElement(
        EventMap,
        {
          history: this.history,
          panel: this
        },
        null
      ),
      this.contentBox
    );
    this.crumbBox.updateNode(runNodey, checkpoint, index, indexB);*/
    // TODO
  }

  highlightCell(index: number) {
    // TODO this.crumbBox.summary.highlightCell(index);
  }
}
