angular.module('app.services', ['ngCordova'])

.service('Utils', function($cordovaToast) {
    /* Firebase keys cannot have a period (.) in them, so this converts the emails to valid keys */
    this.emailToKey = function(emailAddress) {
        return emailAddress.replace(/\./g, ',');
    };

    this.validateEmail = function validateEmail(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    };

    this.toastLong = function(message) {
        try {
            $cordovaToast.showLongBottom(message);
        } catch (err) {
            console.log(message);
        }
    };

    this.toastShort = function(message) {
        console.log(message);
        try {
            $cordovaToast.showShortBottom(message);
        } catch (err) {
            console.log(message);
        }
    };
});
