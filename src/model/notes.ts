import { serialized_Note } from "../file-manager";

export class Notes {
  id: number;
  readonly target: string;
  readonly target_type: string;
  text: string;

  constructor(target: string, type: string, text: string = "") {
    this.target_type = type;
    this.target = target;
    this.text = text;
  }

  toJSON(): serialized_Note {
    return {
      target_type: this.target_type,
      target: this.target,
      note: this.text
    };
  }
}

export namespace Notes {
  export function fromJSON(data: serialized_Note): Notes {
    return new Notes(data.target, data.target_type, data.note);
  }
}
