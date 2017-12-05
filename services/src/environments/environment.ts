// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
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
