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
class CellContainer extends React.Component<{ cells: ghostCellState[] }> {
  render() {
    return (
      <div className="v-Verdant-GhostBook">
        <GhostToolbar />
        <div className="v-Verdant-GhostBook-cellArea">{this.showCells()}</div>
      </div>
    );
  }

  private showCells() {
    return this.props.cells.map((cell: ghostCellState, index: number) => {
      return <GhostCell key={index} id={index} />;
    });
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    cells: state.ghostCells
  };
};

const GhostCellContainer = connect(mapStateToProps)(CellContainer);
