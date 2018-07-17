import { serialized_Star } from "../file-manager";

export class Star {
  id: number;
  readonly target: string;
  readonly target_type: string;

  constructor(target: string, type: string) {
    this.target_type = type;
    this.target = target;
  }

  toJSON(): serialized_Star {
    return { target_type: this.target_type, target: this.target };
  }
}

export namespace Star {
  export function fromJSON(data: serialized_Star): Star {
    return new Star(data.target, data.target_type);
  }
}
