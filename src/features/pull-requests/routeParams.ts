export const BRANCH_NAME_PATTERN = /^(?!-)(?!.*\.\.)[^\s~^:?*[\\\x00-\x1f\x7f]{1,255}$/;
export const PULL_NUMBER_PATTERN = /^[0-9]{1,9}$/;
export const SHA_PATTERN = /^[0-9a-f]{40}$/;
export const PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\0]{1,1024}$/;
