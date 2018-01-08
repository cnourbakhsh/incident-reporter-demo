#!/bin/bash

read -p "What is the URL for Nexus? (e.g. http://nexus3-incident-demo.192.168.99.100.nip.io) " NEXUS_URL
MINISHIFT_URL=`echo $NEXUS_URL | cut -c29-`
echo $MINISHIFT_URL
