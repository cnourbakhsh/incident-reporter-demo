#!/bin/bash

#Check requirements
MINISHIFT_CHECK=`minishift status`

if ["$MINISHIFT_CHECK" != "Running"]
then
    echo "Error: Minishift is not currently running"
    exit
fi

echo "logging into minishift"
    oc login -u developer -p developer

echo "Deleted Existing Routes to be recreated"
    oc delete routes exposed-mobile-backend-route
	oc delete routes exposed-supervisor-route

#Expose remote routes for use by mobile devices
read -p "Please enter your local IP address (e.g. 192.168.99.55): " LOCAL_IP_ADDRESS
echo "Using local IP address[$LOCAL_IP_ADDRESS] to setup exposed routes ..."

#Remote route for mobile backend
oc expose service/mobile-backend --name=exposed-mobile-backend-route --hostname=mobile-backend-incident-demo.$LOCAL_IP_ADDRESS.nip.io

#Remote route for supervisor server
oc expose service/supervisor-server --name=exposed-supervisor-route --hostname=supervisor-server-incident-demo.$LOCAL_IP_ADDRESS.nip.io
    