import * as React from "react";
import NotebookEvent from "./event";
import {verdantState} from "../../redux";
import {connect} from "react-redux";
import {eventState} from "src/verdant/redux/events";

const DATE_BUNDLE_HEADER = "Verdant-events-date-bundle-header";
const DATE_BUNDLE_CONTAINER = "Verdant-events-date-bundle-container";


type DateBundle_Props = {
  events: number[]; // Indices of events prop of NotebookEventDate
  date_id: number;
  event_states: eventState[];
}

class NotebookEventDateBundle extends React.Component<DateBundle_Props> {
  render() {
    if (this.props.events.length == 1) {
      console.log(`Index: ${this.props.events[0]}\nArray: ${this.props.event_states}`);
      return (
        <NotebookEvent
          date_id={this.props.date_id}
          event_id={this.props.events[0]}
          events={this.props.event_states[this.props.events[0]]}
        />
      );
    } else {
      return ( // TODO: Add header with conditional generation
        <div>
          <div className={DATE_BUNDLE_HEADER}></div>
          <div className={DATE_BUNDLE_CONTAINER}>
            {this.props.events.map((id, index) => {
              return (
                <div key={id}>
                  <NotebookEvent
                    date_id={this.props.date_id}
                    event_id={id}
                    events={this.props.event_states[index]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<DateBundle_Props>
) => {
  return {
    event_states: state.dates[ownProps.date_id].events
  };
};

export default connect(mapStateToProps)(NotebookEventDateBundle);
