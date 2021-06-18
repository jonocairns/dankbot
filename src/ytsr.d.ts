interface Result {
  url: string;
  title: string;
}

interface SearchResult {
  query: string;
  items: Array<Result>;
}

declare function ytsr(
  searchString: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
): Promise<SearchResult>;

declare namespace ytsr {
  function getFilters(
    searchString: string,
    callback: (error: Error, result: SearchResult) => void
  ): {};
}

export default ytsr;
