#!/usr/bin/env bash

sudo mount --make-shared /
docker ps
rm -rf .kube/

export EXTERNAL_IP_ADDRESS="`curl http://169.254.169.254/latest/meta-data/public-ipv4`"

export EXTERNAL_HOSTNAME="`curl http://169.254.169.254/latest/meta-data/public-hostname`"

oc cluster up --routing-suffix=$EXTERNAL_IP_ADDRESS.nip.io --public-hostname=$EXTERNAL_HOSTNAME 