
export enum AppMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  FOCUS = 'FOCUS'
}

export interface HandData {
  x: number;
  y: number;
  pinch: boolean;
  fist: boolean;
  open: boolean;
}

export interface AppState {
  mode: AppMode;
  handData: HandData | null;
  uiVisible: boolean;
  isLoaded: boolean;
}
