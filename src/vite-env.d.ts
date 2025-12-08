

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.jpg';
declare module '*.png';
declare module '*.json';

declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};
