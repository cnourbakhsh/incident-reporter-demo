#!/usr/bin/env bash

#This script will deploy the project onto Minishift

#Check requirements
MINISHIFT_CHECK=`minishift status`
MVN_CHECK=`mvn -version`
OC_CHECK=`oc`

if ["$MINISHIFT_CHECK" != "Running"]
then
    echo "Error: Minishift is not currently running"
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
oc login -u system:admin
oc create -f openshift/nexus3-persistent-template.yaml -n openshift
oc create -f openshift/jboss-image-streams.json -n openshift

#Create the project
oc login -u developer -p developer
oc new-project incident-demo

#Deploy Nexus
oc new-app --template=nexus3-persistent -p VOLUME_CAPACITY=25Gi
NEXUS_STATUS=`oc get pods`
echo "Waiting for Nexus to deploy"
sleep 5
echo $NEXUS_STATUS
while [[ "$NEXUS_STATUS" == *"nexus3-1-deploy"* || "$NEXUS_STATUS" == "" || "$NEXUS_STATUS" == *"nexus3-1-build"* ]]
do
sleep 5
NEXUS_STATUS=`oc get pods`
echo "."
done
echo "Deployment done"
read -p "What is the URL for Nexus? (e.g. http://nexus3-incident-demo.192.168.99.100.nip.io) NO TRAILING SLASHES!" NEXUS_URL
MINISHIFT_URL=`echo $NEXUS_URL | cut -c29-`

#Build the domain
cd domain
rm -rf pom.xml

FILE="./pom.xml"
/bin/cat <<EOM > $FILE
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
<modelVersion>4.0.0</modelVersion>
<groupId>com.redhat.vizuri.summit17</groupId>
<artifactId>domain</artifactId>
<version>0.0.1-SNAPSHOT</version>
<properties>
<nexus.url>$NEXUS_URL</nexus.url>
<maven.compiler.target>1.8</maven.compiler.target>
<maven.compiler.source>1.8</maven.compiler.source>
</properties>
<distributionManagement>
<repository>
<id>minishift-nexus-releases</id>
<url>$NEXUS_URL/repository/maven-releases/</url>
</repository>
<snapshotRepository>
<id>minishift-nexus-snapshots</id>
<url>$NEXUS_URL/repository/maven-snapshots/</url>
</snapshotRepository>
</distributionManagement>
</project>
EOM

mvn --settings domain-settings.xml deploy
cd ..

#Deploy the Decision Server
oc new-app registry.access.redhat.com/jboss-decisionserver-6/decisionserver63-openshift~https://github.com/emurphy58/incident-reporter-demo.git --context-dir=decisions -e KIE_SERVER_USER='decider' -e KIE_SERVER_PASSWORD='decider#99' --name=decision-server
oc expose svc/decision-server

#Deploy the Process Server
oc new-app registry.access.redhat.com/jboss-processserver-6/processserver63-openshift~https://github.com/emurphy58/incident-reporter-demo.git --context-dir=processes -e KIE_SERVER_USER='processor' -e KIE_SERVER_PASSWORD='processor#99' -e KIE_SERVER_BPM_UI_DISABLED=false -e KIE_SERVER_BYPASS_AUTH_USER=true -e RESPONDER_PUSH_USER_NAME=test -e RESPONDER_PUSH_USER_SECRET=test -e RESPONDER_PUSH_ENDPOINT='http://mobile-backend-incident-demo.'$MINISHIFT_URL -e REPORTER_PUSH_USER_NAME=test -e REPORTER_PUSH_USER_SECRET=test -e REPORTER_PUSH_ENDPOINT='http://mobile-backend-incident-demo.'$MINISHIFT_URL --name=process-server
oc expose svc/process-server

#Deploy the Services Server
oc new-app registry.access.redhat.com/jboss-webserver-3/webserver31-tomcat8-openshift~https://github.com/Vizuri/incident-reporter-demo.git --context-dir=services -e SPRING_APPLICATION_JSON='{"zuul":{"routes":{"bpm":{"url":"http://process-server-incident-demo.'$MINISHIFT_URL'", "sensitiveHeaders":"Cookie,Set-Cookie"}}},"spring":{"data":{"rest":{"base-path":"/api"}},"http":{"multipart":{"max-file-size":"10MB","max-request-size":"10MB"}}}}' --name=services-server
oc expose svc/services-server

#Deploy the Mobile Backend
oc new-app registry.access.redhat.com/rhscl/nodejs-4-rhel7~https://github.com/emurphy58/incident-reporter-demo.git --context-dir=mobile/backend -e DECISION_SERVER_HOST='decision-server-incident-demo.'$MINISHIFT_URL -e DECISION_CONTAINER_ID=4c1342a8827bf46033cb95f0bdf27f0b -e DECISION_BASIC_AUTH='Basic ZGVjaWRlcjpkZWNpZGVyIzk5' -e PROCESS_SERVER_HOST='process-server-incident-demo.'$MINISHIFT_URL -e PROCESS_CONTAINER_ID=1776e960572610314f3f813a5dbb736d -e PROCESS_BASIC_AUTH='Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==' --name=mobile-backend -e SERVICES_SERVER_HOST='services-server-incident-demo.'$MINISHIFT_URL -e OPENSHIFT_NODEJS_PORT=8080 -e OPENSHIFT_NODEJS_IP=0.0.0.0
oc expose svc/mobile-backend
