import * as React from "react";
import { connect } from "react-redux";
import { verdantState } from "../../redux/index";
import { Checkpoint } from "../../../lilgit/model/checkpoint";
import { History } from "../../../lilgit/model/history";
import NotebookEvent from "./event";
import { eventState } from "src/verdant/redux/events";

const DATE_HEADER = "Verdant-events-date-header";
const DATE_GROUP = "Verdant-events-date-container";
const DATE_LABEL = "Verdant-events-date-header-label";

type NotebookDate_Props = {
  date_id: number;
  date: number;
  events: eventState[];
  history: History;
  eventCount: number; // TODO
};

class NotebookEventDate extends React.Component<NotebookDate_Props> {
  render() {
    return (
      <div>
        <div className={DATE_HEADER}>
          <div className={DATE_LABEL}>
            {Checkpoint.formatDate(this.props.date)}
          </div>
        </div>
        <div className={DATE_GROUP}>
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
    /*let onOpen = () => (textLabel.textContent = dateString);
    let onClose = () => {
      textLabel.textContent =
        dateString + " (" + this.events[dateString].length + ")";
    };*/
    //VersionSampler.addCaret(header, content, true, onOpen, onClose);
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<NotebookDate_Props>
) => {
  let dateState = state.dates[ownProps.date_id];
  return {
    history: state.history,
    date: dateState.date,
    events: dateState.events,
    eventCount: dateState.events.length
  };
};

export default connect(mapStateToProps)(NotebookEventDate);
