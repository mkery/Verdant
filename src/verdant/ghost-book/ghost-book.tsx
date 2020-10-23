import React from "react";
import GhostCell from "./ghost-cell";
import GhostToolbar from "./ghost-toolbar";
import { connect } from "react-redux";
import { Store } from "redux";
import { Provider } from "react-redux";
import { verdantState } from "../redux/";
import { CellRunData } from "../../lilgit/checkpoint";

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
  cells: { [name: string]: CellRunData };
  scrollFocus: string;
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

    let cellDivs: JSX.Element[] = [];

    Object.keys(this.props.cells).forEach((name: string) => {
      const cell = this.props.cells[name];
      if (!cell.index) return;

      if (this.props.scrollFocus === cell.cell) {
        const ref = React.createRef<HTMLDivElement>();
        cellDivs[cell.index] = (
          <div key={cell.index} ref={ref}>
            <GhostCell
              name={cell.cell}
              change={cell.changeType}
              output={cell.output ? cell.output[0] : null}
              prior={cell.prior}
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
        cellDivs[cell.index] = (
          <div key={cell.index}>
            <GhostCell
              name={cell.cell}
              change={cell.changeType}
              output={cell.output ? cell.output[0] : null}
              prior={cell.prior}
            />
          </div>
        );
      }
    });

    return cellDivs;
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    cells: state.ghostBook.cells,
    scrollFocus: state.ghostBook.scroll_focus || "",
  };
};

const GhostCellContainer = connect(mapStateToProps)(CellContainer);
