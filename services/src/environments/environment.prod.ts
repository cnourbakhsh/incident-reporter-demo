export const environment = {
  production: true,
  host: 'http://process-server-incident-demo.192.168.99.100.nip.io',
  auth_header: 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==',
  containerId: '1776e960572610314f3f813a5dbb736d',
  metadataUrlChunk: '/bpm/kie-server/services/rest/server/queries/processes/instances/',
  metadataUrlChunkParams: {
    withVars: true
  },
  imagesUrlChunk: '/bpm/kie-server/services/rest/server/containers/',
  imagesUrlChunkWithProcesses: '/images/processes/instances/'
};
