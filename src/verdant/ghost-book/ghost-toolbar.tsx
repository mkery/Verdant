import * as React from "react";
import {connect} from "react-redux";
import {History} from "../../lilgit/model/history";
import {Checkpoint} from "../../lilgit/model/checkpoint";
import {log} from "../../lilgit/components/notebook";
import {verdantState} from "../redux/index";
import {toggleShowAllCells} from "../redux/ghost";

/* CSS Constants */
const JP_TOOLBAR = "jp-Toolbar";

const HEADER = "v-Verdant-GhostBook-header";
const HEADER_ROW = `${HEADER}-row`;


interface GhostToolbar_Props {
  history: History;
  name: number;
  checked: boolean;
  toggleShow: () => void;
}


class Toolbar extends React.Component<GhostToolbar_Props> {
  public render() {
    return (
      <div className={`${HEADER} ${JP_TOOLBAR}`}>
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
    let time;
    if (created)
      // error save from older log format
      time =
        Checkpoint.formatDate(created.timestamp) +
        " " +
        Checkpoint.formatTime(created.timestamp);

    return (
      <div className={HEADER_ROW}>
        <div> Viewing version # {this.props.name + 1} of
          notebook {time ? "from " + time : ""} </div>
      </div>
    );
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    name: state.notebook_ver,
    checked: state.show_all_cells,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    toggleShow: () => dispatch(toggleShowAllCells()),
  };
};

const GhostToolbar = connect(mapStateToProps, mapDispatchToProps)(Toolbar);

export default GhostToolbar;
