import * as React from "react";
import {connect} from "react-redux";
import {verdantState} from "../../redux/index";
import {Checkpoint, CheckpointType} from "../../../lilgit/model/checkpoint";
import {History} from "../../../lilgit/model/history";
import {dateOpen, dateClose, eventState} from "../../redux/events";
import NotebookEventDateBundle from "./event-date-bundle";

const DATE_HEADER = "Verdant-events-date-header";
const DATE_GROUP = "Verdant-events-date-container";
const DATE_LABEL = "Verdant-events-date-header-label";
const DATE_COLLAPSE_HEADER = "Verdant-events-date-collapse-header";
const DATE_COUNT = "Verdant-events-date-collapse-header-count";
const DATE_ARROW = "Verdant-events-date-collapse-header-arrow";

const INTERVAL_WIDTH = 300000; // Max bundle time interval in milliseconds

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
  private eventType(e: eventState): CheckpointType {
    /* Returns CheckpointType if all checkpoints in event have same type,
       else returns null */
    const reducer = (acc, current) => acc === current ? acc : null;
    return e.events.map(c => c.checkpointType).reduce(reducer);
  }

  private computeBundles(events: eventState[]): number[][] {
    /* Computes list of bundled indices based on timestamp, ordered such that
       flattening the outer list leads to a reversed list of the indices of
       this.props.events */
    interface accumulatorObject { // TODO: where should this be moved?
      accumulator: number[][]; // Holds partially constructed bundle output
      timeBound: number; // Lower limit on time for inclusion in latest bundle
      lastType: CheckpointType; // Type of current bundle
    }

    const reducer = (accObj: accumulatorObject, e: eventState, idx) => {
      // Compute properties of current element
      let timeStamp = e.events[0].timestamp;
      let eventType = this.eventType(e);
      if ((timeStamp > accObj.timeBound) &&
        (eventType === accObj.lastType)) { // add event to current bundle
        const newAccumulator = accObj.accumulator.slice(0, -1).concat(
          [accObj.accumulator[accObj.accumulator.length - 1].concat([idx])]
        )
        return {
          accumulator: newAccumulator,
          timeBound: accObj.timeBound,
          lastType: accObj.lastType
        }
      } else { // create new bundle
        return {
          accumulator: accObj.accumulator.concat([[idx]]),
          timeBound: timeStamp - INTERVAL_WIDTH,
          lastType: eventType
        }
      }
    }
    return events.reduceRight(reducer, {
      accumulator: [],
      timeBound: Infinity,
      lastType: null
    }).accumulator
  }

  makeBundles() {
    const bundledIndices = this.computeBundles(this.props.events);

    // Creates DateBundle for each set of dates
    return bundledIndices.map(
      (idx_list, i) => (
        <div key={i}>
          <NotebookEventDateBundle
            bundle_id={i}
            events={[...idx_list]}
            date_id={this.props.date_id}
          />
        </div>
      )
    )
  }

  render() {
    return (
      <div>
        <div className={DATE_HEADER}
             onClick={() => {
               if (this.props.isOpen) this.props.close(this.props.date_id);
               else this.props.open(this.props.date_id);
             }}>
          <div className={DATE_LABEL}>
            {Checkpoint.formatDate(this.props.date)}
          </div>
          <div className={DATE_COLLAPSE_HEADER}>
            <div
              className={`${DATE_COUNT} ${this.props.isOpen ? "hidden" : ""}`}>
              ({this.props.events.length})
            </div>
            <div
              className={`${DATE_ARROW} ${this.props.isOpen ? "" : "closed"}`}>
            </div>
          </div>
        </div>
        <div className={DATE_GROUP}>
          {this.props.isOpen ? this.makeBundles() : null}
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
    history: state.getHistory(),
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
