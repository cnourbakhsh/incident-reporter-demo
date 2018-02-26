let notifications = {
    reporterNotifications: [],
    responderNotifications: []
};

exports.addReporterNotification = (notification) => {
    notifications.reporterNotifications.push(notification);
};

exports.addResponderNotification = (notification) => {
    notifications.responderNotifications.push(notification);
};

exports.getNotifications = function (req, res, next) {
    console.log('app getNotifications');
    res.send(notifications.reporterNotifications.concat(notifications.responderNotifications));
    next();
};

exports.getReporterNotifications = function (req, res, next) {
    console.log('app getReporterNotifications');
    res.send(notifications.reporterNotifications);
    next();
};

exports.getResponderNotifications = function (req, res, next) {
    console.log('app getResponderNotifications');
    res.send(notifications.responderNotifications);
    next();
};