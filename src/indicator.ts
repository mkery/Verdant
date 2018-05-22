import {
  Widget
} from '@phosphor/widgets';


export
class Indicator extends Widget {

  constructor() {
    super();
    this.addClass('verdant-indicator');
  }

  focus() {
    this.addClass('focused')
  }

  blur() {
    this.removeClass('focused')
  }

  get versionNum(): number {
    return this._versionNum;
  }
  set versionNum(value: number) {
    this._versionNum = value;
    if (value === null) {
      this.node.textContent = 'v-1';
    } else {
        this.node.textContent = `v${value}`;
    }
  }

  private _versionNum: number = -1;
}
