export type artifactDetailState = {
  openDetailPairs: string[];
};

export const artifactDetailInitialState = (): artifactDetailState => {
  return {
    openDetailPairs: [],
  };
};
