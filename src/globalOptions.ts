/**
 * Global Options interface. Those are always possible, for any script.
 *
 * Most of them are provided out-of-the-box by Caporal.
 */
export interface IGlobalOptions {
  silent?: boolean;
  v?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  color?: boolean; // "no-color" becomes "color: false"
  nc?: boolean; // "no compilation" custom global option
}
