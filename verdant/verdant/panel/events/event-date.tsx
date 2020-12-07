import * as React from "react";
import { connect } from "react-redux";
import { Checkpoint } from "../../../lilgit/checkpoint";
import { ChevronRightIcon, ChevronDownIcon } from "../../icons";
import { verdantState, dateOpen, dateClose, eventState } from "../../redux/";
import NotebookEventDateBundle from "./event-date-bundle";

/* CSS Constants */
const DATE_HEADER = `Verdant-events-date-header`;
const DATE_HEADER_LABEL = `${DATE_HEADER}-label`;
const DATE_HEADER_COLLAPSE = `${DATE_HEADER}-collapse`;

type req_NotebookDate_Props = { date_id: number };

type NotebookDate_Props = {
  // provided by redux store
  date: number;
  events: eventState[];
  isOpen: boolean;
  open: (d: number) => void;
  close: (d: number) => void;
  bundles: number[][];
} & req_NotebookDate_Props;

class NotebookEventDate extends React.Component<NotebookDate_Props> {
  render() {
    return (
      <div>
        <div
          className={DATE_HEADER}
          onClick={() => {
            if (this.props.isOpen) this.props.close(this.props.date_id);
            else this.props.open(this.props.date_id);
          }}
        >
          {this.showArrow()}
          <div className={DATE_HEADER_LABEL}>
            {Checkpoint.formatDate(this.props.date)}
          </div>
          <div className={DATE_HEADER_COLLAPSE}>
            <div style={{ display: this.props.isOpen ? "none" : "" }}>
              ({this.props.events.length})
            </div>
          </div>
        </div>
        <div>{this.props.isOpen ? this.makeBundles() : null}</div>
      </div>
    );
  }

  private showArrow() {
    if (this.props.isOpen) return <ChevronDownIcon />;
    return <ChevronRightIcon />;
  }

  private makeBundles() {
    // Creates DateBundle for each set of dates
    return this.props.bundles.map((idx_list, i) => (
      <NotebookEventDateBundle
        key={i}
        bundle_id={i}
        events={[...idx_list]}
        date_id={this.props.date_id}
      />
    ));
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    open: (d) => dispatch(dateOpen(d)),
    close: (d) => dispatch(dateClose(d)),
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: req_NotebookDate_Props
) => {
  let dateState = state.eventView.dates[ownProps.date_id];
  return {
    date: dateState.date,
    events: dateState.events,
    isOpen: dateState.isOpen,
    bundles: dateState.bundles,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NotebookEventDate);
