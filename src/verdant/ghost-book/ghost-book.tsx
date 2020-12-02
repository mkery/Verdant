import React from "react";
import GhostCell from "./ghost-cell";
import GhostToolbar from "./ghost-toolbar";
import { connect } from "react-redux";
import { Store } from "redux";
import { Provider } from "react-redux";
import { verdantState } from "../redux/";

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
  cells: string[];
  scrollFocus: string;
}

/*
 * Make a sub class to contain cells to make updates work across notebooks better
 */
class CellContainer extends React.Component<GhostCellContainer_Props> {
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

    return this.props.cells.map((cell: string, index: number) => {
      if (this.props.scrollFocus === cell) {
        const ref = React.createRef<HTMLDivElement>();
        return (
          <div key={index} ref={ref}>
            <GhostCell
              name={cell}
              scrollTo={() =>
                ref?.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                })
              }
            />
          </div>
        );
      } else {
        return (
          <div key={index}>
            <GhostCell name={cell} />
          </div>
        );
      }
    });
  }
}

const mapStateToProps = (state: verdantState) => {
  let history = state.getHistory();
  const notebook = history?.store?.getNotebook(state.ghostBook.notebook_ver);
  const cells = notebook?.cells || [];

  return {
    cells,
    scrollFocus: state.ghostBook.scroll_focus || "",
  };
};

const GhostCellContainer = connect(mapStateToProps)(CellContainer);
