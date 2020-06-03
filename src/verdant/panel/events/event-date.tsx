import * as React from "react";
import {connect} from "react-redux";
import {verdantState} from "../../redux/index";
import {Checkpoint} from "../../../lilgit/model/checkpoint";
import {History} from "../../../lilgit/model/history";
import NotebookEvent from "./event";
import {dateOpen, dateClose, eventState} from "../../redux/events";

const DATE_HEADER = "Verdant-events-date-header";
const DATE_GROUP = "Verdant-events-date-container";
const DATE_LABEL = "Verdant-events-date-header-label";
const DATE_COLLAPSE_HEADER = "Verdant-events-date-collapse-header";
const DATE_COUNT = "Verdant-events-date-collapse-header-count";
const DATE_ARROW = "Verdant-events-date-collapse-header-arrow";

type NotebookDate_Props = {
  date_id: number;
  date: number;
  events: eventState[];
  history: History;
  eventCount: number; // TODO
  isOpen: boolean;
  open: (d: number) => void;
  close: (d: number) => void;
};

class NotebookEventDate extends React.Component<NotebookDate_Props> {
  render() {
    return (
      <div>
        <div className={DATE_HEADER}>
          <div className={DATE_LABEL}>
            {Checkpoint.formatDate(this.props.date)}
          </div>
          <div className={DATE_COLLAPSE_HEADER}>
            <div
              className={`${DATE_COUNT} ${this.props.isOpen ? "hidden" : ""}`}>
              ({this.props.events.length})
            </div>
            <div
              className={`${DATE_ARROW} ${this.props.isOpen ? "" : "closed"}`}
              onClick={() => {
                if (this.props.isOpen) this.props.close(this.props.date_id);
                else this.props.open(this.props.date_id);
              }}>
            </div>
          </div>
        </div>
        <div
          className={`${DATE_GROUP} ${this.props.isOpen ? "" : "hidden"}`}>
          {this.props.events.map((_, index) => {
            let reverse = this.props.events.length - 1 - index;
            return (
              <div key={reverse}>
                <NotebookEvent
                  date_id={this.props.date_id}
                  event_id={reverse}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    open: (d) => dispatch(dateOpen(d)),
    close: (d) => dispatch(dateClose(d))
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<NotebookDate_Props>
) => {
  let dateState = state.dates[ownProps.date_id];
  return {
    history: state.history,
    date: dateState.date,
    events: dateState.events,
    eventCount: dateState.events.length,
    isOpen: dateState.isOpen,
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotebookEventDate);
