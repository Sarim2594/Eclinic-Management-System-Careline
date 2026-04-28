export function buildTableState(rows, options) {
  const {
    query = '',
    sortKey,
    sortDirection = 'asc',
    page = 1,
    pageSize = 5,
    filterFn,
  } = options;

  let nextRows = Array.isArray(rows) ? [...rows] : [];

  if (filterFn && query) {
    nextRows = nextRows.filter((row) => filterFn(row, query));
  }

  if (sortKey) {
    nextRows.sort((left, right) => {
      const a = left?.[sortKey];
      const b = right?.[sortKey];
      const result = compareSortValues(a, b);
      return sortDirection === 'desc' ? result * -1 : result;
    });
  }

  const totalRows = nextRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const visibleRows = nextRows.slice(start, start + pageSize);

  return {
    rows: visibleRows,
    totalRows,
    totalPages,
    page: safePage,
  };
}

function compareSortValues(left, right) {
  if (left === right) return 0;
  if (left === undefined || left === null || left === '') return -1;
  if (right === undefined || right === null || right === '') return 1;

  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    if (leftNumber === rightNumber) return 0;
    return leftNumber > rightNumber ? 1 : -1;
  }

  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    if (leftDate === rightDate) return 0;
    return leftDate > rightDate ? 1 : -1;
  }

  const leftText = `${left}`.toLowerCase();
  const rightText = `${right}`.toLowerCase();
  if (leftText === rightText) return 0;
  return leftText > rightText ? 1 : -1;
}

export function nextSort(currentKey, currentDirection, requestedKey) {
  if (currentKey !== requestedKey) return { sortKey: requestedKey, sortDirection: 'asc' };
  return { sortKey: requestedKey, sortDirection: currentDirection === 'asc' ? 'desc' : 'asc' };
}
