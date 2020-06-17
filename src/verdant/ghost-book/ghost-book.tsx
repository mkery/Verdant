import * as React from "react";
import GhostCell from "./ghost-cell";
import GhostToolbar from "./ghost-toolbar";
import { ghostCellState } from "../redux/ghost";
import { connect } from "react-redux";
import { Store } from "redux";
import { Provider } from "react-redux";
import { verdantState } from "../redux";

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

/*
 * Make a sub class to contain cells to make updates work across notebooks better
 */
class CellContainer extends React.Component<{ cells: Map<string, ghostCellState> }> {
  render() {
    return (
      <div className="v-Verdant-GhostBook">
        <GhostToolbar />
        <div className="v-Verdant-GhostBook-cellArea">{this.showCells()}</div>
      </div>
    );
  }

  private showCells() {
    /* Map cells to GhostCells */
    // construct list from Map
    let cellList = [...this.props.cells.entries()];
    // sort list by index of cell
    cellList.sort(
      (a, b) =>
        a[1].index - b[1].index
    );
    return cellList.map((cell, index: number) =>
      <GhostCell key={index} name={cell[0]} />
    );
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    cells: state.ghostCells
  };
};

const GhostCellContainer = connect(mapStateToProps)(CellContainer);
