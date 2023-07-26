#!/bin/bash

SCRIPTS_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_PATH=$( dirname "${SCRIPTS_PATH}")
ENVIRONMENTS_PATH="${REPO_PATH}/environments"

echo 'Patching /h5ai-nginx/select-contract-form'
#TARGET_URL=$(. ${ENVIRONMENTS_PATH}/.env; printf '%s' "$SERVER_URL")
#echo "REACT_APP_SERVER_URL=${TARGET_URL}" > ${REPO_PATH}/h5ai-nginx/select-contract-form/.env
cd ${REPO_PATH}/h5ai-nginx
git apply ../h5ai-nginx-patch/select-contract-form.patch

