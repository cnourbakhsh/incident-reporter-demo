#!/usr/bin/env bash

#This script will deploy the project on the openshift platform

#Check requirements
OPENSHIFT_CHECK=`oc cluster status`
MVN_CHECK=`mvn -version`
OC_CHECK=`oc`

if [[ "OPENSHIFT_CHECK" == *"Error"* ]]
then
    echo "Error: Openshift is not currently running"
    exit
fi

if [[ "$MVN_CHECK" != *"Apache Maven"* ]]
then
    echo "Error: Maven is not installed"
    exit
fi

if [[ "$OC_CHECK" != *"OpenShift Client"* ]]
then
    echo "Error: Openshift CLI is not installed"
    exit
fi

#Create the templates
echo "getting nexus and jboss images"
cd /home/ec2-user/incident-reporter-demo
oc login -u system:admin
oc create -f setup/nexus3-persistent-template.yaml -n openshift

#oc import-image my-sonatype/nexus-repository-manager --from=registry.connect.redhat.com/sonatype/nexus-repository-manager --confirm
oc import-image my-rhscl/nodejs-8-rhel7 --from=registry.access.redhat.com/rhscl/nodejs-8-rhel7 --confirm
oc import-image my-jboss-decisionserver-6/decisionserver64-openshift --from=registry.access.redhat.com/jboss-decisionserver-6/decisionserver64-openshift --confirm
oc import-image my-jboss-processserver-6/processserver64-openshift --from=registry.access.redhat.com/jboss-processserver-6/processserver64-openshift --confirm
oc import-image my-jboss-webserver-3/webserver31-tomcat8-openshift --from=registry.access.redhat.com/jboss-webserver-3/webserver31-tomcat8-openshift --confirm



#Create the project
echo "logging into minishift"
oc login -u developer -p developer
oc delete project myproject
oc new-project incident-demo

#Deploy Nexus
oc new-app --template=nexus3-persistent
NEXUS_STATUS=`oc get pods`
echo "Waiting for Nexus to deploy ... "
sleep 5
echo $NEXUS_STATUS
while [[ "$NEXUS_STATUS" == *"nexus3-1-deploy"* || "$NEXUS_STATUS" == "" || "$NEXUS_STATUS" == *"nexus3-1-build"* ]]
do
sleep 5
NEXUS_STATUS=`oc get pods`
echo "$NEXUS_STATUS"
done
export NEXUS_URL="http://`oc get route nexus3 | awk 'FNR == 2 {print $2}'`"
echo "NEXUS_URL: $NEXUS_URL"
echo "Deployment done `oc get route nexus3`"
#read -p "What is the URL for Nexus? (e.g. http://nexus3-incident-demo.192.168.99.100.nip.io) NO TRAILING SLASHES!" NEXUS_URL
export MINISHIFT_URL=`echo $NEXUS_URL | cut -c29-`

echo "MINISHIFT_URL: $MINISHIFT_URL"
#Build the domain
cd domain

echo "Build and deploy the domain model ..."
mvn --settings domain-settings.xml deploy
cd ..

export LOCAL_IP_ADDRESS="`curl http://169.254.169.254/latest/meta-data/public-ipv4`"

#Deploy the Decision Server
oc new-app registry.access.redhat.com/jboss-decisionserver-6/decisionserver64-openshift~https://github.com/cnourbakhsh/incident-reporter-demo.git#consolidated --context-dir=decisions -e KIE_SERVER_USER='decider' -e KIE_SERVER_PASSWORD='decider#99' --name=decision-server
oc expose svc/decision-server

#Deploy the Process Server
oc new-app registry.access.redhat.com/jboss-processserver-6/processserver64-openshift~https://github.com/cnourbakhsh/incident-reporter-demo.git#consolidated --context-dir=processes -e KIE_SERVER_USER='processor' -e KIE_SERVER_PASSWORD='processor#99' -e KIE_SERVER_BPM_UI_DISABLED=false -e KIE_SERVER_BYPASS_AUTH_USER=true -e RESPONDER_PUSH_USER_NAME=test -e RESPONDER_PUSH_USER_SECRET=test -e RESPONDER_PUSH_ENDPOINT='http://mobile-backend-incident-demo.'$MINISHIFT_URL -e REPORTER_PUSH_USER_NAME=test -e REPORTER_PUSH_USER_SECRET=test -e REPORTER_PUSH_ENDPOINT='http://mobile-backend-incident-demo.'$MINISHIFT_URL --name=process-server
oc expose svc/process-server

#Deploy the Supervisor Server
oc new-app registry.access.redhat.com/jboss-webserver-3/webserver31-tomcat8-openshift~https://github.com/cnourbakhsh/incident-reporter-demo.git#consolidated --context-dir=services -e SPRING_APPLICATION_JSON='{"zuul":{"routes":{"bpm":{"url":"http://process-server-incident-demo.'$MINISHIFT_URL'", "sensitiveHeaders":"Cookie,Set-Cookie"}}},"spring":{"data":{"rest":{"base-path":"/api"}},"http":{"multipart":{"max-file-size":"10MB","max-request-size":"10MB"}}}}' --name=supervisor-server
oc expose svc/supervisor-server

#Deploy the Mobile Backend
oc new-app registry.access.redhat.com/rhscl/nodejs-8-rhel7~https://github.com/cnourbakhsh/incident-reporter-demo.git#consolidated --context-dir=backend -e DECISION_SERVER_HOST='decision-server-incident-demo.'$MINISHIFT_URL -e DECISION_CONTAINER_ID=4c1342a8827bf46033cb95f0bdf27f0b -e DECISION_BASIC_AUTH='Basic ZGVjaWRlcjpkZWNpZGVyIzk5' -e PROCESS_SERVER_HOST='process-server-incident-demo.'$MINISHIFT_URL -e PROCESS_CONTAINER_ID=1776e960572610314f3f813a5dbb736d -e PROCESS_BASIC_AUTH='Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==' --name=mobile-backend -e SERVICES_SERVER_HOST='supervisor-server-incident-demo.'$MINISHIFT_URL -e EXPOSED_SERVICES_SERVER_HOST='supervisor-server-incident-demo.'$LOCAL_IP_ADDRESS'.nip.io' -e OPENSHIFT_NODEJS_PORT=8080 -e OPENSHIFT_NODEJS_IP=0.0.0.0
oc expose svc/mobile-backend


echo "User the following URL to access the supervisor UI: http://supervisor-server-incident-demo.$LOCAL_IP_ADDRESS.nip.io/supervisor-ui/"
