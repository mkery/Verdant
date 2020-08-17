import * as React from "react";
import GhostCell from "./ghost-cell";
import GhostToolbar from "./ghost-toolbar";
import { connect } from "react-redux";
import { Store } from "redux";
import { Provider } from "react-redux";
import { verdantState, ghostCellState } from "../redux/";

/* CSS Constants */
const BOOK = "v-Verdant-GhostBook";
const BOOK_CELLAREA = `${BOOK}-cellArea`;

export interface GhostBook_Props {
  store: Store;
}

export class GhostBook extends React.Component<GhostBook_Props, {}> {
  render() {
    return (
      <Provider store={this.props.store}>
        <GhostCellContainer />
      </Provider>
    );
  }
}

export interface GhostCellContainer_Props {
  cells: Map<string, ghostCellState>;
  diffPresent: boolean;
}

/*
 * Make a sub class to contain cells to make updates work across notebooks better
 */
class CellContainer extends React.Component<GhostCellContainer_Props> {
  render() {
    return (
      <div className={BOOK}>
        <GhostToolbar />
        <div className={BOOK_CELLAREA}>{this.showCells()}</div>
      </div>
    );
  }

  private showCells() {
    /* Map cells to GhostCells */
    // construct list from Map
    let cellList = [...this.props.cells.entries()];
    // sort list by index of cell
    cellList.sort((a, b) => a[1].index - b[1].index);
    return cellList.map((cell, index: number) => (
      <GhostCell
        key={index}
        name={cell[0]}
        id={cell[1].index}
        events={cell[1].events}
        output={cell[1].output}
        prior={cell[1].prior}
      />
    ));
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    cells: state.ghostCells,
    diffPresent: state.diffPresent,
  };
};

const GhostCellContainer = connect(mapStateToProps)(CellContainer);
