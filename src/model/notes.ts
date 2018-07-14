

export class Notes {
  id: number;
  readonly target: any;
  readonly target_type: string;
  text: string;

  constructor(
    target: any,
    type: string,
    text: string = ""
  ) {
    this.target_type = type;
    this.target = target;
    this.text = text
  }
}
