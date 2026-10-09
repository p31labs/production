import { useMemo } from 'react';
import { loadConfig, type P31Config } from '../config';

export function useConfig(): P31Config {
  return useMemo(() => loadConfig(), []);
}
