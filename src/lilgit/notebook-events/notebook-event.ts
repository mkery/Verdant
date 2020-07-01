import { Checkpoint } from "../checkpoint";
import { History } from "../history/";
import { VerNotebook } from "../notebook";
import { NodeyCell } from "../nodey/";

// 1. event begins
// 2. trigger update to history model
// 3. record details of the event as a checkpoint
// 4. event ends

export abstract class NotebookEvent {
  readonly history: History;
  readonly notebook: VerNotebook;
  checkpoint: Checkpoint;

  constructor(notebook: VerNotebook) {
    this.notebook = notebook;
    this.history = notebook.history;
  }

  public runEvent(): Promise<Checkpoint> {
    let ev = new Promise<Checkpoint>(async (accept) => {
      // create a checkpoint to record this event
      this.createCheckpoint();

      // evaluate what updates are needed to the model caused by this event
      let changedCells = await this.modelUpdate();

      // record the checkpoint based on model updates we did
      this.recordCheckpoint(changedCells);

      // any wrap-up steps specific to this event
      this.endEvent();

      // finish event and return
      accept(this.checkpoint);
    });
    return ev;
  }

  abstract async modelUpdate(): Promise<NodeyCell[]>;

  abstract createCheckpoint(): void;

  abstract recordCheckpoint(changedCells: NodeyCell[]): void;

  endEvent(): void {}
}
