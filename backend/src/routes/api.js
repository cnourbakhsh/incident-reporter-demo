let express = require('express');
let router = express.Router();
let bpmsRouter = express.Router();
let notificationsRouter = express.Router();

let bodyParser = require('body-parser');
let jsonParser = bodyParser.json();

let notifications_service = require('../controllers/notifications_service');
//let claim_services = require('../controllers/claim_services');
let decision_service = require('../controllers/decision_service');
let process_service = require('../controllers/process_service');

bpmsRouter.post('/startprocess', jsonParser, process_service.startProcess);
bpmsRouter.post('/add-comments/:instanceId', jsonParser, process_service.addComment);
bpmsRouter.post('/doadjuster/:instanceId/:complete', jsonParser, process_service.performRemediation);
bpmsRouter.post('/customer-incident', jsonParser, decision_service.createIncident);
bpmsRouter.post('/update-questions', jsonParser, decision_service.updateQuestions);
//bpmsRouter.post('s/upload-photo/:instanceId/:fileName/:messageSource', upload.single('file'), claimAddPhoto);
bpmsRouter.post('/accept-base64-image/:instanceId/:fileName/:messageSource', bodyParser.text({ type: 'text/plain', limit: '100000000' }), process_service.acceptBase64Image);

notificationsRouter.get('/reporter', jsonParser, notifications_service.getReporterNotifications);
notificationsRouter.get('/responder', jsonParser, notifications_service.getResponderNotifications);
notificationsRouter.get('/', jsonParser, notifications_service.getNotifications);

router.get('/claims', jsonParser, process_service.getExistingClaims);
router.use('/bpms', bpmsRouter);
router.use('/notifications', notificationsRouter);
router.get('/test', jsonParser, (req, res) => { res.json({ 'isRunning': true }); });

module.exports = router;