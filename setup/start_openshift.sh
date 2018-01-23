#!/usr/bin/env bash

sudo mount --make-shared /
docker ps
rm -rf .kube/

oc cluster up --routing-suffix=`curl http://169.254.169.254/latest/meta-data/public-ipv4`.nip.io --public-hostname=`curl http://169.254.169.254/latest/meta-data/public-hostname` 