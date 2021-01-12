import { History } from "../../../verdant-model/history";
import { Checkpoint } from "../../../verdant-model/checkpoint";

export namespace Bundles {
  /*
   * - isOpen indicates if the bundle is open in thw activity pane UI
   * - bundleEvents contains the indices of checkpoints in dateState.events
   * that should be bundled together
   * - targetCells_notebookIndex is the cached data about what happens in this
   * bundle that gives us enough information to quickly update the bundle and
   * tell if the minimap for this bundle needs updating (needed if a checkpoint updates
   * its target cells)
   */
  export type bundleState = {
    isOpen: boolean;
    bundleEvents: number[];
    targetCells_notebookIndex: { [cell: string]: number };
  };

  export const bundleInitialState = (): bundleState => {
    return { isOpen: false, bundleEvents: [], targetCells_notebookIndex: {} };
  };

  /*
   * CONDITIONS TO BUNDLE EVENTS
   * 1. occur within the same time bound
   * 2. notebooks A and B don't have conflicting cells at the same index
   * 3. no events have conflicting events for the same cell
   */
  const MAX_INTERVAL = 300000; // Max bundle time interval in milliseconds

  // compute bundles for all events in the list
  export function computeBundles(event_list: Checkpoint[], history: History) {
    let bundle_list: bundleState[] = [];
    for (let i = 0; i < event_list.length; i++) {
      bundle_list = bundleEvent(i, event_list, bundle_list, history);
    }
    return bundle_list;
  }

  // add just one event to bundles
  export function bundleEvent(
    event_idx: number,
    event_list: Checkpoint[],
    bundle_list: bundleState[],
    history: History
  ) {
    const newEvent = event_list[event_idx];
    const newTargetCells = calcTargetCellNotebookIndex(newEvent, history);
    const latestBundle = bundle_list[0];
    if (latestBundle) {
      const lastEvent = event_list[latestBundle?.bundleEvents[0]];

      // 1) time bound check
      let interval = newEvent?.timestamp - lastEvent?.timestamp;
      if (interval && interval <= MAX_INTERVAL) {
        // 2+3) check compatibility of events
        let zippedTargets = zipTargets(
          newTargetCells,
          latestBundle.targetCells_notebookIndex
        );
        if (zippedTargets) {
          // OK to combine to latest bundle
          latestBundle.bundleEvents.unshift(event_idx);
          latestBundle.targetCells_notebookIndex = zippedTargets;
          bundle_list[0] = latestBundle;
          return bundle_list;
        }
      }
    }

    // Conditions to bundle failed. Add this event to its own new bundle
    let newBundle: bundleState = {
      isOpen: false,
      bundleEvents: [event_idx],
      targetCells_notebookIndex: newTargetCells,
    };
    bundle_list.unshift(newBundle);

    return bundle_list;
  }

  export function updateBundleForEvent(
    event_idx: number,
    event_list: Checkpoint[],
    bundle_list: bundleState[],
    history: History
  ) {
    let event = event_list[event_idx];

    // first find the bundle that contains this event
    let bundle_idx = bundle_list.findIndex((bundle) =>
      bundle.bundleEvents.includes(event_idx)
    );

    if (bundle_idx > -1) {
      let targetCells = calcTargetCellNotebookIndex(event, history);
      let bundle = bundle_list[bundle_idx];
      let zippedTargets = { ...targetCells };

      // check that this event still works with its current bundle
      let compatible = bundle.bundleEvents.every((ev) => {
        let bundled_event = event_list[ev];
        // skip this one
        if (bundled_event && event_idx !== ev) {
          let targets = calcTargetCellNotebookIndex(bundled_event, history);
          zippedTargets = zipTargets(zippedTargets, targets);
          return zippedTargets !== undefined;
        } else return true; // compatible with yourself
      });

      if (compatible) {
        bundle.targetCells_notebookIndex = zippedTargets;
        bundle_list[bundle_idx] = bundle;
      }
      // gotta kick out of this bundle
      else {
        // first get rid of this bundle since it no longer works
        if (bundle_idx === 0) bundle_list.shift();
        else bundle_list.splice(bundle_idx, 1);

        // recalculate all the bundles this one on, yuck
        for (
          let i = bundle.bundleEvents[bundle.bundleEvents.length - 1];
          i < event_list.length;
          i++
        ) {
          bundle_list = bundleEvent(i, event_list, bundle_list, history);
        }
      }
    }
    return bundle_list;
  }

  // returns a combination of A and B if they are compatible and undefined otherwise
  function zipTargets(
    A: { [cell: string]: number },
    B: { [cell: string]: number }
  ): { [cell: string]: number } | undefined {
    let cells_A = Object.keys(A);
    let zipped = { ...B };

    // A and B can't both contain changes to the same cell
    let success = cells_A.every((cell) => {
      if (B[cell] === undefined) {
        zipped[cell] = A[cell];
        return true;
      }
      return false;
    });

    if (success) {
      // A and B can't have different cells assigned to the same index
      let vals = Object.values(zipped);
      let no_dups = vals.every((v, index) => vals.indexOf(v, index + 1) < 0);

      if (no_dups) return zipped;
    }

    return;
  }

  function calcTargetCellNotebookIndex(event: Checkpoint, history: History) {
    let targetCells_notebookIndex: { [cell: string]: number } = {};
    const notebook_ver = event?.notebook;
    if (notebook_ver !== undefined) {
      const notebook = history?.store?.getNotebook(notebook_ver);
      if (notebook) {
        event?.targetCells?.forEach((target) => {
          let idx = notebook.cells?.indexOf(target.cell);
          if (target.index !== undefined) idx = target.index; // get index of deleted cells too
          targetCells_notebookIndex[target.cell] = idx;
        });
      }
    }
    return targetCells_notebookIndex;
  }
}
