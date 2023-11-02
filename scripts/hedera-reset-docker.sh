#!/bin/bash
#
# Resets the contract verifications for the given network by removing the 2 directories
# in the repository which store the partial matches and full matches.
# Assumes that the services (server, ui, repository) are shutdown
#

if [ "$#" -ne 1 ]; then
  echo "Usage: hedera-reset-docker.sh testnet | previewnet"
  exit 22
fi

case ${1} in
  previewnet) CHAIN_ID=297 ;;
  testnet) CHAIN_ID=296 ;;
  *) echo "Usage: hedera-reset-docker.sh testnet | previewnet"; exit 22;;
esac

CONTRACT_PATH="/home/data/repository/contracts"

if [ ! -d "${CONTRACT_PATH}" ]; then
  echo "Expected contract repository was not found at this path: ${CONTRACT_PATH}"
  exit 2
fi

PARTIAL_MATCH_PATH="${CONTRACT_PATH}/partial_match/${CHAIN_ID}"
FULL_MATCH_PATH="${CONTRACT_PATH}/full_match/${CHAIN_ID}"

reset_network () {
  NETWORK_PATH=${1}
  if [ -d "${NETWORK_PATH}" ]; then
    echo "  Erasing contents of ${NETWORK_PATH}"
    rm -rf "${NETWORK_PATH}"
  else
    echo "  ${NETWORK_PATH} does not exist"
  fi
}

echo "Resetting Hedera ${1} (Chain ID: ${CHAIN_ID})"
reset_network ${PARTIAL_MATCH_PATH}
reset_network ${FULL_MATCH_PATH}