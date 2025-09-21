type PaginationItemType = number | 'ellipsis';

export const getPaginationItems = (
  currentPage: number,
  totalPages: number,
): PaginationItemType[] => {
  const pages = new Set<number>();

  pages.add(1);
  pages.add(totalPages);

  pages.add(currentPage - 1);
  pages.add(currentPage);
  pages.add(currentPage + 1);

  const sortedPages = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result: PaginationItemType[] = [];

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i];

    if (i > 0) {
      const prev = sortedPages[i - 1];
      const gap = page - prev;

      if (gap === 2) {
        result.push(prev + 1);
      } else if (gap > 2) {
        result.push('ellipsis');
      }
    }

    result.push(page);
  }

  return result;
};
