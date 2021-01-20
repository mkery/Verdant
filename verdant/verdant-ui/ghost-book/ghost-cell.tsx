import * as React from "react";
import { NodeyCell, Nodey } from "../../verdant-model/nodey";
import { Namer } from "../../verdant-model/sampler";
import GhostCellOutput from "./ghost-cell-output";
import { connect } from "react-redux";
import { verdantState, focusGhostCell, showDetailOfNode } from "../redux/";
import { ChangeType } from "../../verdant-model/checkpoint";
import { DiffCell } from "../../verdant-model/sampler/diff";

/* CSS Constants */
const CONTAINER = "v-Verdant-GhostBook-container";
const CONTAINER_STACK = `${CONTAINER}-stack`;

const CELL = "v-Verdant-GhostBook-cell";
const CELL_BAND = `${CELL}-band`;
const CELL_CONTAINER = `${CELL}-container`;
const CELL_CONTENT = `${CELL}-content`;

// Enum for types of cells
export type req_GhostCell_Props = {
  // String id of the cell
  cell: DiffCell;
  scrollTo?: () => void;
};
export type GhostCell_Props = {
  nodey: NodeyCell;
  // On-click action
  clickEv: () => void;
  // On-focus action
  hasFocus: () => boolean;
  // open up detail of nodey
  showDetail: (n: Nodey) => void;
  //scroll
  scrollFocus: string;
  inspectOn: boolean;
} & req_GhostCell_Props;

class GhostCell extends React.Component<GhostCell_Props> {
  render() {
    /* Render cell */

    if (!this.props.cell) {
      // ERROR case
      console.log("ERROR: CAN'T FIND GHOST CELL", this.props.cell.name);
      return null;
    }
    const active = this.props.hasFocus() ? "active" : "";

    return (
      <div
        className={`${CONTAINER} ${active} ${this.props.cell.status}`}
        onClick={() => this.props.clickEv()}
      >
        <div className={CONTAINER_STACK}>
          <div
            className="v-Verdant-GhostBook-cell-label"
            onClick={() => this.props.showDetail(this.props.nodey)}
          >
            {Namer.getCellVersionTitle(this.props.nodey)}
          </div>
          <div
            className={`${CELL_CONTAINER}${
              this.props.inspectOn ? " hoverInspect" : ""
            }`}
            onClick={() => {
              if (this.props.inspectOn) this.props.showDetail(this.props.nodey);
            }}
          >
            <div className="v-Verdant-GhostBook-cell-header" />
            <div className={`${CELL_BAND} ${active}`} />
            <div className={`${CELL_CONTENT} ${active}`}>
              <div
                className={`${CELL} ${
                  this.props?.nodey?.typeChar === "c" ? "code" : "markdown"
                }  ${active}`}
                dangerouslySetInnerHTML={{
                  __html: this.props.cell.sample.outerHTML,
                }}
              />
            </div>
          </div>
          <GhostCellOutput
            cell={this.props.nodey}
            changed={this.props.cell.status.includes(ChangeType.OUTPUT_CHANGED)}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: req_GhostCell_Props
) => {
  const history = state.getHistory();
  const nodey = history?.store?.get(ownProps.cell.name);

  return {
    nodey,
    diff: state.ghostBook.diff,
    hasFocus: () => state.ghostBook.active_cell === ownProps.cell.name,
    scrollFocus: state.ghostBook.scroll_focus,
    inspectOn: state.artifactView.inspectOn,
  };
};

const mapDispatchToProps = (dispatch: any, ownProps: req_GhostCell_Props) => {
  return {
    clickEv: () =>
      ownProps.cell.name ? dispatch(focusGhostCell(ownProps.cell.name)) : null,
    showDetail: (n: Nodey) => dispatch(showDetailOfNode(n)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GhostCell);
