'use client';

import { useState, useCallback } from 'react';

export interface RandomParams {
  format: string;
  count: number;
  min?: number;
  max?: number;
  base?: number;
  columns?: number;
}

export function useRandomNumbers() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateNumbers = useCallback(async (params: RandomParams): Promise<string> => {
    setIsLoading(true);
    setError(null);

    const requestBody = {
      ...params,
      columns: params.columns || 5, // Default to 5 columns if not specified
      min: params.min ?? 0, // Default to 0 if not specified
      max: params.max ?? 100, // Default to 100 if not specified
      base: params.base ?? 10 // Default to base 10 if not specified
    };

    console.log('Generating numbers with params:', requestBody);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        throw new Error(`Generation failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data.numbers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Generation error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convenience function for getting random integers
  const getRandomIntegers = useCallback(async (count: number, min: number, max: number): Promise<number[]> => {
    const result = await generateNumbers({
      format: 'plain',
      count,
      min,
      max,
      base: 10,
      columns: 1
    });

    return result.split(/[\s,\n]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n));
  }, [generateNumbers]);

  // Convenience function for getting random floats between 0 and 1
  const getRandomFloats = useCallback(async (count: number): Promise<number[]> => {
    const result = await generateNumbers({
      format: 'plain',
      count,
      min: 0,
      max: 1000000000, // Use large range and divide for precision
      base: 10,
      columns: 1
    });

    return result.split(/[\s,\n]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n))
      .map(n => n / 1000000000); // Convert to 0-1 range
  }, [generateNumbers]);

  // Convenience function for coin flips (true/false)
  const getRandomBooleans = useCallback(async (count: number): Promise<boolean[]> => {
    const integers = await getRandomIntegers(count, 0, 1);
    return integers.map(n => n === 1);
  }, [getRandomIntegers]);

  // Convenience function for random choice from array
  const getRandomChoice = useCallback(async <T>(choices: T[]): Promise<T> => {
    if (choices.length === 0) throw new Error('Cannot choose from empty array');
    const indices = await getRandomIntegers(1, 0, choices.length - 1);
    return choices[indices[0]];
  }, [getRandomIntegers]);

  // Convenience function for multiple random choices from array
  const getRandomChoices = useCallback(async <T>(choices: T[], count: number): Promise<T[]> => {
    if (choices.length === 0) throw new Error('Cannot choose from empty array');
    const indices = await getRandomIntegers(count, 0, choices.length - 1);
    return indices.map(i => choices[i]);
  }, [getRandomIntegers]);

  return {
    generateNumbers,
    getRandomIntegers,
    getRandomFloats,
    getRandomBooleans,
    getRandomChoice,
    getRandomChoices,
    isLoading,
    error
  };
}