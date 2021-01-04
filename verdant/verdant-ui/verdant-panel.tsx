import * as React from "react";
import { Store } from "redux";
import { Provider } from "react-redux";
import Panel from "./panel";

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
}
