#!/bin/bash

SCRIPTS_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_PATH=$( dirname "${SCRIPTS_PATH}")
ENVIRONMENTS_PATH="${REPO_PATH}/environments"

echo 'Patching /h5ai-nginx/select-contract-form'
cd ${REPO_PATH}/h5ai-nginx
git apply ../hedera-patch/h5ai-nginx.patch
