import { useContext } from 'react';
import ShoehiveContext from './ShoehiveContext';

/**
 * Hook to use Shoehive client in React components
 */
export const useShoehive = () => {
  const context = useContext(ShoehiveContext);
  if (!context) {
    throw new Error('useShoehive must be used within a ShoehiveProvider');
  }
  return context;
};

export default useShoehive; 