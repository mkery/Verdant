import { CellRunData } from "./constants";

export class Checkpoint {
  readonly timestamp: number;
  notebook: number;
  readonly targetCells: CellRunData[];

  //runID, timestamp, notebook, runCells, output
  constructor(options: { [key: string]: any }) {
    this.timestamp = options.timestamp;
    this.notebook = options.notebook;
    this.targetCells = options.targetCells;
  }

  get id() {
    return this.timestamp;
  }

  public toJSON(): Checkpoint.SERIALIZE {
    return {
      timestamp: this.timestamp,
      notebook: this.notebook,
      targetCells: this.targetCells,
    };
  }
}

export namespace Checkpoint {
  export function fromJSON(dat: Checkpoint.SERIALIZE): Checkpoint {
    return new Checkpoint({
      timestamp: dat.timestamp,
      notebook: dat.notebook,
      targetCells: dat.targetCells,
    });
  }

  export interface SERIALIZE {
    timestamp: number;
    notebook: number;
    targetCells: CellRunData[];
  }

  export function formatTime(date: Date | number): string {
    if (date === null || date === undefined) return "";

    if (typeof date == "number") date = new Date(date);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + ampm;
  }

  export function formatDate(date: Date | number): string {
    if (date === null || date === undefined) return "";

    if (typeof date == "number") date = new Date(date);
    var monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    var dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    var dateDesc = "";

    if (sameDay(today, date)) dateDesc = "today ";
    else if (sameDay(yesterday, date)) dateDesc = "yesterday ";
    else dateDesc = dayNames[date.getDay()] + " ";

    dateDesc +=
      monthNames[date.getMonth()] +
      " " +
      date.getDate() +
      " " +
      date.getFullYear();
    return dateDesc;
  }

  export function formatShortDate(date: Date | number): string {
    if (date === null || date === undefined) return "";

    if (typeof date == "number") date = new Date(date);
    var monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "June",
      "July",
      "Aug",
      "Sept",
      "Oct",
      "Nov",
      "Dec",
    ];

    return (
      monthNames[date.getMonth()] +
      " " +
      date.getDate() +
      ", " +
      date.getFullYear()
    );
  }

  export function sameDay(d1: Date | number, d2: Date | number) {
    if (typeof d1 == "number") d1 = new Date(d1);
    if (typeof d2 == "number") d2 = new Date(d2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  export function beforeDay(d1: Date, d2: Date) {
    return (
      !this.sameDay(d1, d2) &&
      d1.getFullYear() <= d2.getFullYear() &&
      d1.getMonth() <= d2.getMonth() &&
      d1.getDate() <= d2.getDate()
    );
  }

  export function sameMinute(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate() &&
      d1.getHours() === d2.getHours() &&
      d1.getMinutes() === d2.getMinutes()
    );
  }

  export function dateNow(): Date {
    var d = new Date();
    d.setHours(12, 0, 0); // set to default time since we only want the day
    return d;
  }
}
