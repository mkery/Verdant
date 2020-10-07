import React from "react";
import GhostCell from "./ghost-cell";
import GhostToolbar from "./ghost-toolbar";
import { connect } from "react-redux";
import { Store } from "redux";
import { Provider } from "react-redux";
import { verdantState, ghostCellState } from "../redux/";

/* CSS Constants */
const BOOK = "v-Verdant-GhostBook";
const BOOK_CELLAREA = `${BOOK}-cellArea`;

//const scrollToRef = (ref) => window.scrollTo(0, ref.current.offsetTop);

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
  scrollFocus: string;
}

/*
 * Make a sub class to contain cells to make updates work across notebooks better
 */
class CellContainer extends React.Component<
  GhostCellContainer_Props,
  { scroll_to: string }
> {
  constructor(props: GhostCellContainer_Props) {
    super(props);
    // keep track of cell div ref for scroll purposes
    this.state = { scroll_to: null };
  }

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

    return cellList.map((cell, index: number) => {
      if (this.props.scrollFocus === cell[0]) {
        const ref = React.createRef<HTMLDivElement>();
        return (
          <div key={index} ref={ref}>
            <GhostCell
              name={cell[0]}
              id={cell[1].index}
              events={cell[1].events}
              output={cell[1].output}
              prior={cell[1].prior}
              scrollTo={() =>
                ref.current.scrollIntoView({
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
            <GhostCell
              name={cell[0]}
              id={cell[1].index}
              events={cell[1].events}
              output={cell[1].output}
              prior={cell[1].prior}
            />
          </div>
        );
      }
    });
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    cells: state.ghostBook.cells,
    diffPresent: state.ghostBook.diffPresent,
    scrollFocus: state.ghostBook.scroll_focus,
  };
};

const GhostCellContainer = connect(mapStateToProps)(CellContainer);
