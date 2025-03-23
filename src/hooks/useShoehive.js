import { useContext } from 'react';
import ShoehiveContext from '../context/ShoehiveContext';

/**
 * Custom hook for accessing Shoehive client and state
 */
const useShoehive = () => {
  const context = useContext(ShoehiveContext);
  
  if (!context) {
    throw new Error('useShoehive must be used within a ShoehiveProvider');
  }
  
  return context;
};

export default useShoehive; 