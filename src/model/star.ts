

export class Star {
  id: number;
  readonly target: any;
  readonly target_type: string;

  constructor(
    target: any,
    type: string
  ) {
    this.target_type = type;
    this.target = target;
  }
}
