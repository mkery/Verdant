import * as React from "react";

export class InspectIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 19 18"
        aria-labelledby="title"
        className="v-VerdantPanel-inspectorButton-icon"
      >
        <title id="title">Inspector Icon</title>
        <path d="M7 0a7 7 0 016.84 8.494l4.53 1.976a.67.67 0 01.028 1.223l-.098.037-3.69 1.12a.67.67 0 00-.374.284l-.046.086-1.55 3.53a.67.67 0 01-1.223.018l-.037-.098-1.052-3.51A7 7 0 117 0zm6.5 12.91c.167-.38.492-.67.89-.79l3.49-1.06-4.24-1.84-4.27-1.85L12 16.25zM7.504 3.5H6.497v3.625l-3.135.896.277.958 3.865-1.096V3.5z" />
      </svg>
    );
  }
}

export class ChevronDownIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 10 16"
        aria-labelledby="title"
        className="verdant-icon-chevron"
      >
        <title id="title">Chevron Down Icon</title>
        <path d="M5 11L0 6l1.5-1.5L5 8.25 8.5 4.5 10 6l-5 5z" />
      </svg>
    );
  }
}

export class ChevronRightIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -3 7 16"
        aria-labelledby="title"
        className="verdant-icon-chevron"
      >
        <title id="title">Chevron Right Icon</title>
        <path d="M6.5 5l-5 5L0 8.5 3.75 5 0 1.5 1.5 0z" />
      </svg>
    );
  }
}

export class ChevronLeftIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -3 7 16"
        aria-labelledby="title"
        className="verdant-icon-chevron"
      >
        <title id="title">Chevron Left Icon</title>
        <path d="M.5 5l5 5L7 8.5 3.25 5 7 1.5 5.5 0z" />
      </svg>
    );
  }
}

export class SearchIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 17 19"
        aria-labelledby="title"
        className="v-VerdantPanel-searchIcon"
      >
        <title id="title">Search Icon</title>
        <path d="M9.45.14a7.05 7.05 0 013.253 12.246l3.747 4.864a.81.81 0 01-.15 1.12.79.79 0 01-.46.16.76.76 0 01-.63-.31l-3.82-4.934a7.04 7.04 0 01-3.29.824h-.03A7.49 7.49 0 016.66 14a7.05 7.05 0 01-5.52-8.34A7.05 7.05 0 019.45.14zM8.058 1.6h.012a5.43 5.43 0 00-3 .91 5.45 5.45 0 00-1.52 7.55 5.44 5.44 0 009.798-1.711l.052-.229A5.45 5.45 0 009.14 1.7a6.8 6.8 0 00-.725-.086L8.058 1.6z" />
      </svg>
    );
  }
}

export class BigChevronRightIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-labelledby="title"
        className="verdant-icon-big-chevron"
        viewBox="0 0 9 16"
      >
        <title id="title">Large Chevron Right Icon</title>
        <path fill="none" strokeWidth="2" d="M1.375 1l6 7-6 7" />
      </svg>
    );
  }
}

export class BigChevronLeftIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-labelledby="title"
        className="verdant-icon-big-chevron"
        viewBox="0 0 9 16"
      >
        <title id="title">Large Chevron Left Icon</title>
        <path fill="none" strokeWidth="2" d="M7.625 1l-6 7 6 7" />
      </svg>
    );
  }
}

export class XIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 12 16"
        aria-labelledby="title"
        className="verdant-icon-x"
      >
        <title id="title">X Cancel Icon</title>
        <path
          fillRule="evenodd"
          d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"
        />
      </svg>
    );
  }
}

export class ExportIcon extends React.Component {
  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 11 13"
        aria-labelledby="title"
        className="verdant-icon-export"
      >
        <title id="title">Export Icon</title>
        <path
          fillRule="nonzero"
          d="M6 1.7071V8.5c0 .27614-.22386.5-.5.5S5 8.77614 5 8.5V1.7071L3.85355 2.85356c-.19526.19527-.51184.19527-.7071 0-.19527-.19526-.19527-.51184 0-.7071l2-2c.19526-.19527.51184-.19527.7071 0l2 2c.19527.19526.19527.51184 0 .7071-.19526.19527-.51184.19527-.7071 0L6 1.70711zm1.5 4.23734c-.27614 0-.5-.22385-.5-.5 0-.27614.22386-.5.5-.5h3c.27614 0 .5.22386.5.5v6.11112c0 .27614-.22386.5-.5.5H.5c-.27614 0-.5-.22386-.5-.5V5.5c0-.27253.21826-.49487.49074-.49991l3-.05556c.2761-.00511.50406.21456.50917.49066.00512.2761-.21456.50406-.49065.50917L1 5.99083v5.06473h9V5.94444H7.5z"
        />
      </svg>
    );
  }
}
