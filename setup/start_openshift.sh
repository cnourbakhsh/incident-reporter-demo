#!/usr/bin/env bash

cd /home/ec2-user/incident-reporter-demo

git checkout consolidated
git pull origin consolidated

# for aws linux 2 you need to start docker manually
#sudo service docker start

sudo mount --make-shared /
docker ps
rm -rf .kube/

export EXTERNAL_IP_ADDRESS="`curl http://169.254.169.254/latest/meta-data/public-ipv4`"

export EXTERNAL_HOSTNAME="`curl http://169.254.169.254/latest/meta-data/public-hostname`"

oc cluster up --routing-suffix=$EXTERNAL_IP_ADDRESS.nip.io --public-hostname=$EXTERNAL_HOSTNAME 