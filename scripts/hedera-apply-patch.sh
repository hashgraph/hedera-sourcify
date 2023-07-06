#!/bin/bash

SCRIPTS_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_PATH=$( dirname "${SCRIPTS_PATH}")

echo 'Patching /h5ai-nginx/select-contract-form'
cp ${REPO_PATH}/h5ai-nginx-patch/.env ${REPO_PATH}/h5ai-nginx/select-contract-form/
cd ${REPO_PATH}/h5ai-nginx
git apply ../h5ai-nginx-patch/select-contract-form.patch

