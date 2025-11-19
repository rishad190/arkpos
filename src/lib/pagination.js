/**
 * Pagination utilities for large lists
 */

/**
 * Paginate an array of items
 * @template T
 * @param {Array<T>} items - Items to paginate
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} Pagination result
 */
export function paginate(items, page = 1, pageSize = 20) {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    pagination: {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      startIndex,
      endIndex,
      startItem: startIndex + 1,
      endItem: endIndex,
    },
  };
}

/**
 * Create pagination metadata
 * @param {number} totalItems - Total number of items
 * @param {number} currentPage - Current page (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} Pagination metadata
 */
export function createPaginationMetadata(totalItems, currentPage, pageSize) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const page = Math.max(1, Math.min(currentPage, totalPages || 1));
  
  return {
    currentPage: page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    startItem: (page - 1) * pageSize + 1,
    endItem: Math.min(page * pageSize, totalItems),
  };
}

/**
 * Get page numbers for pagination UI
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total number of pages
 * @param {number} [maxVisible=5] - Maximum number of page buttons to show
 * @returns {Array<number|string>} Array of page numbers (includes '...' for gaps)
 */
export function getPageNumbers(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const halfVisible = Math.floor(maxVisible / 2);
  
  // Always show first page
  pages.push(1);
  
  let startPage = Math.max(2, currentPage - halfVisible);
  let endPage = Math.min(totalPages - 1, currentPage + halfVisible);
  
  // Adjust if we're near the start
  if (currentPage <= halfVisible + 1) {
    endPage = Math.min(totalPages - 1, maxVisible - 1);
  }
  
  // Adjust if we're near the end
  if (currentPage >= totalPages - halfVisible) {
    startPage = Math.max(2, totalPages - maxVisible + 2);
  }
  
  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pages.push('...');
  }
  
  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  // Add ellipsis before last page if needed
  if (endPage < totalPages - 1) {
    pages.push('...');
  }
  
  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }
  
  return pages;
}

/**
 * Custom hook for pagination state management
 * @param {Array} items - Items to paginate
 * @param {number} [initialPageSize=20] - Initial page size
 * @returns {Object} Pagination state and controls
 */
export function usePagination(items, initialPageSize = 20) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  
  const result = paginate(items, currentPage, pageSize);
  
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, result.pagination.totalPages || 1)));
  };
  
  const nextPage = () => {
    if (result.pagination.hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const previousPage = () => {
    if (result.pagination.hasPreviousPage) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const changePageSize = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };
  
  // Reset to page 1 when items change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);
  
  return {
    ...result,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
  };
}

/**
 * Calculate optimal page size based on viewport height
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} [minPageSize=10] - Minimum page size
 * @param {number} [maxPageSize=100] - Maximum page size
 * @returns {number} Optimal page size
 */
export function calculateOptimalPageSize(itemHeight, minPageSize = 10, maxPageSize = 100) {
  if (typeof window === 'undefined') {
    return 20; // Default for SSR
  }
  
  const viewportHeight = window.innerHeight;
  const availableHeight = viewportHeight - 200; // Account for header, footer, etc.
  const itemsPerPage = Math.floor(availableHeight / itemHeight);
  
  return Math.max(minPageSize, Math.min(itemsPerPage, maxPageSize));
}

/**
 * Filter and paginate items
 * @template T
 * @param {Array<T>} items - Items to filter and paginate
 * @param {Function} filterFn - Filter function
 * @param {number} page - Current page
 * @param {number} pageSize - Page size
 * @returns {Object} Filtered and paginated result
 */
export function filterAndPaginate(items, filterFn, page, pageSize) {
  const filteredItems = items.filter(filterFn);
  return paginate(filteredItems, page, pageSize);
}

/**
 * Sort and paginate items
 * @template T
 * @param {Array<T>} items - Items to sort and paginate
 * @param {Function} sortFn - Sort comparison function
 * @param {number} page - Current page
 * @param {number} pageSize - Page size
 * @returns {Object} Sorted and paginated result
 */
export function sortAndPaginate(items, sortFn, page, pageSize) {
  const sortedItems = [...items].sort(sortFn);
  return paginate(sortedItems, page, pageSize);
}

export default {
  paginate,
  createPaginationMetadata,
  getPageNumbers,
  usePagination,
  calculateOptimalPageSize,
  filterAndPaginate,
  sortAndPaginate,
};
