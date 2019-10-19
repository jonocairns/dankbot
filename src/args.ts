import {prefix} from './index';

export const args = (input: string): string | undefined => {
  const args = input.slice(prefix.length).split(/ +/);
  return args.shift();
};
