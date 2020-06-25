import * as React from "react";
import {connect} from "react-redux";
import {History} from "../../lilgit/model/history";
import {Checkpoint} from "../../lilgit/model/checkpoint";
import {verdantState} from "../redux/index";
import {toggleShowAllCells} from "../redux/ghost";

/* CSS Constants */
const JP_TOOLBAR = "jp-Toolbar";

const HEADER = "v-Verdant-GhostBook-header";
const HEADER_ROW = `${HEADER}-row`;
const HEADER_TOGGLE = `${HEADER}-toggle`;
const HEADER_TOGGLE_TEXT = `${HEADER_TOGGLE}-text`;
const HEADER_TOGGLE_BUTTON = `${HEADER_TOGGLE}-button`;


interface GhostToolbar_Props {
  history: History;
  name: number;
  diffPresent: boolean;
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
        <div className={HEADER_TOGGLE}>
          <div className={HEADER_TOGGLE_TEXT}>
          {this.props.diffPresent ? "Checked" : "Unchecked"}
          </div>
          <div className={HEADER_TOGGLE_BUTTON}
               onClick={this.props.toggleShow}/>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: verdantState) => {
  return {
    history: state.getHistory(),
    name: state.notebook_ver,
    diffPresent: state.diffPresent,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    toggleShow: () => dispatch(toggleShowAllCells()),
  };
};

const GhostToolbar = connect(mapStateToProps, mapDispatchToProps)(Toolbar);

export default GhostToolbar;
