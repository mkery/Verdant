import * as React from "react";
import {connect} from "react-redux";
import {verdantState} from "../../redux/index";
import {Checkpoint, CheckpointType} from "../../../lilgit/model/checkpoint";
import {dateOpen, dateClose, saveBundles, eventState} from "../../redux/events";
import NotebookEventDateBundle from "./event-date-bundle";

const DATE_HEADER = "Verdant-events-date-header";
const DATE_GROUP = "Verdant-events-date-container";
const DATE_LABEL = "Verdant-events-date-header-label";
const DATE_COLLAPSE_HEADER = "Verdant-events-date-collapse-header";
const DATE_COUNT = "Verdant-events-date-collapse-header-count";
const DATE_ARROW = "Verdant-events-date-collapse-header-arrow";

const INTERVAL_WIDTH = 300000; // Max bundle time interval in milliseconds

interface accumulatorObject {
  accumulator: number[][]; // Holds partially constructed bundle output
  timeBound: number; // Lower limit on time for inclusion in latest bundle
  lastType: CheckpointType; // Type of current bundle
}

type NotebookDate_Props = {
  date_id: number;
  date: number;
  events: eventState[];
  eventCount: number; // TODO
  isOpen: boolean;
  open: (d: number) => void;
  close: (d: number) => void;
  bundles: number[][];
  saveBundles: (bundles: number[][], d: number) => void;
};

class NotebookEventDate extends React.Component<NotebookDate_Props> {
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

  private makeBundles() {
    /* Creates date bundles using bundled indices */
    let bundledIndices;
    if (this.props.bundles === null || // There are no saved bundles
        this.props.bundles.reduce( // The bundles are out of date
          (a, x) => a + x.length, 0
        ) !== this.props.events.length) {
      // If there are no bundles or the bundles need an update, compute bundles
      bundledIndices = this.computeBundles(this.props.events);
      this.props.saveBundles(bundledIndices, this.props.date_id);
    } else {
      // Retrieve stored bundles
      bundledIndices = this.props.bundles;
    }

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

  private computeBundles(events: eventState[]): number[][] {
    /* Helper method for makeBundles.
       Computes list of bundled indices based on timestamp, ordered such that
       flattening the outer list leads to a reversed list of the indices of
       this.props.events */

    return events.reduceRight(this.reducer, {
      accumulator: [],
      timeBound: Infinity,
      lastType: null
    }).accumulator
  }

  private reducer(accObj: accumulatorObject, e: eventState, idx) {
    /* Helper method for computeBundles.
       Function to use in reducing over bundles in computeBundles. */
    // Compute properties of current element
    let timeStamp = e.events[0].timestamp;
    let eventType = NotebookEventDate.eventType(e);
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

  private static eventType(e: eventState): CheckpointType {
    /* Helper for reducer.
       Returns CheckpointType if all checkpoints in event have same type,
       else returns null */
    return e.events.map(c => c.checkpointType).reduce(
      (acc, current) => acc === current ? acc : null
    );
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    open: (d) => dispatch(dateOpen(d)),
    close: (d) => dispatch(dateClose(d)),
    saveBundles: (bundles, d) => dispatch(saveBundles(bundles, d))
  };
};

const mapStateToProps = (
  state: verdantState,
  ownProps: Partial<NotebookDate_Props>
) => {
  let dateState = state.dates[ownProps.date_id];
  return {
    date: dateState.date,
    events: dateState.events,
    eventCount: dateState.events.length,
    isOpen: dateState.isOpen,
    bundles: dateState.bundles
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotebookEventDate);
