import React from "react";
import GhostCell from "./ghost-cell";
import GhostToolbar from "./ghost-toolbar";
import { connect } from "react-redux";
import { Store } from "redux";
import { Provider } from "react-redux";
import { verdantState } from "../redux/";
import { DIFF_TYPE, DiffCell } from "../../verdant-model/sampler/diff";
import { History } from "../../verdant-model/history";

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
  notebook_ver: number;
  diffKind: DIFF_TYPE;
  scrollFocus: string;
  history: History;
}

/*
 * Make a sub class to contain cells to make updates work across notebooks better
 */
class CellContainer extends React.Component<
  GhostCellContainer_Props,
  { cells: DiffCell[] }
> {
  private _isMounted;

  constructor(props: GhostCellContainer_Props) {
    super(props);
    this.state = {
      cells: [],
    };
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.loadCells();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(priorProps: GhostCellContainer_Props) {
    if (this._isMounted)
      if (
        priorProps.diffKind !== this.props.diffKind ||
        (priorProps.notebook_ver !== this.props.notebook_ver &&
          this.props.notebook_ver > 0)
      )
        this.loadCells();
  }

  render() {
    return (
      <div className="v-Verdant-GhostBook">
        <GhostToolbar />
        <div className="v-Verdant-GhostBook-cellArea">{this.showCells()}</div>
      </div>
    );
  }

  private async loadCells() {
    this.props.history.inspector.diff
      .renderNotebook(this.props.notebook_ver, this.props.diffKind)
      .then((cells) => {
        if (cells) this.setState({ cells });
      });
  }

  private showCells() {
    /* Map cells to GhostCells */

    return this.state.cells.map((cell: DiffCell, index: number) => {
      if (this.props.scrollFocus === cell.name) {
        const ref = React.createRef<HTMLDivElement>();
        return (
          <div key={index} ref={ref}>
            <GhostCell
              cell={cell}
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
            <GhostCell cell={cell} />
          </div>
        );
      }
    });
  }
}

const mapStateToProps = (state: verdantState) => {
  const history = state.getHistory();
  const notebook_ver = state.ghostBook.notebook_ver;
  const diffKind = state.ghostBook.diff;
  return {
    history,
    notebook_ver,
    diffKind,
    scrollFocus: state.ghostBook.scroll_focus || "",
  };
};

const GhostCellContainer = connect(mapStateToProps)(CellContainer);
