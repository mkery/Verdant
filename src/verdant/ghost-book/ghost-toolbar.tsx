import * as React from "react";
import { connect } from "react-redux";
import { History } from "../../lilgit/model/history";
import { Checkpoint } from "../../lilgit/model/checkpoint";
import { log } from "../../lilgit/components/notebook";
import { verdantState } from "../redux/index";
import { toggleShowAllCells } from "../redux/ghost";

interface GhostToolbar_Props {
  history: History;
  name: number;
  checked: boolean;
  toggleShow: () => void;
}

const GHOST_TOOLBAR_ROW = "v-Verdant-GhostBook-header-row";

class Toolbar extends React.Component<GhostToolbar_Props> {
  public render() {
    return (
      <div className="jp-Toolbar v-Verdant-GhostBook-header">
        {this.showLabel()}
      </div>
    );
  }

  private showLabel() {
    let notebook = this.props.history.store.getNotebook(this.props.name);
    let created = this.props.history.checkpoints.get(notebook.created);
    log(
      "CHECKPOINT FOUND",
      notebook.created,
      created,
      this.props.history.checkpoints.all()
    );
    let time =
      Checkpoint.formatDate(created.timestamp) +
      " " +
      Checkpoint.formatTime(created.timestamp);

    return (
      <div className={GHOST_TOOLBAR_ROW}>
        {`Viewing version # 
          ${this.props.name + 1}
           of notebook 
           from 
          ${time}`}
      </div>
    );
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.history,
    name: state.notebook_ver,
    checked: state.show_all_cells
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    toggleShow: () => dispatch(toggleShowAllCells())
  };
};

const GhostToolbar = connect(
  mapStateToProps,
  mapDispatchToProps
)(Toolbar);

export default GhostToolbar;
