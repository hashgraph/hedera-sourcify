import {configuration} from "./Configuration";

export const generateRepoLink = (
  chainId: string | number,
  address: string,
  matchStatus: "perfect" | "partial"
) => {
  let matchPath;
  if (matchStatus === "perfect") matchPath = "full_match";
  if (matchStatus === "partial") matchPath = "partial_match";
  return `${configuration.repositoryServerUrl}/contracts/${matchPath}/${chainId}/${address}`;
};
