#!/bin/bash
#
# Resets the contract verifications for previewnet by removing the corresponding directories
# in the repository.
# Assumes that the services (server, ui, repository) are shutdown
#

SCRIPTS_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
${SCRIPTS_PATH}/hedera-reset.sh previewnet