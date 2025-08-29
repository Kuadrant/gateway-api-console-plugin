export interface HTTPRouteHeader {
  id: string;
  type: 'Exact' | 'RegularExpression';
  name: string;
  value: string;
}

export interface HTTPRouteQueryParam {
  id: string;
  type: 'Exact' | 'RegularExpression';
  name: string;
  value: string;
}

export interface HTTPRouteMatch {
  id: string;
  pathType: string;
  pathValue: string;
  method: string;
  headers?: HTTPRouteHeader[];
  queryParams?: HTTPRouteQueryParam[];
}

export interface MatchesWizardStepProps {
  currentRule: {
    matches: HTTPRouteMatch[];
  };
  setCurrentRule: (rule: any) => void;
  t: (key: string) => string;
}
