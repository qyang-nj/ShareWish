angular.module('app.services', ['ngCordova'])

.factory('Utils', function($cordovaToast) {
    var Utils = {};

    var BASE_URL = "https://lovers-wish.firebaseio.com/";
    var refRoot = new Firebase(BASE_URL);

    Utils.refRoot = function() {
        return refRoot;
    };

    Utils.refEmailUidMap = function() {
        return refRoot.child('sys/emailUidMap/');
    };

    Utils.refWishlist = function(uid) {
        return refRoot.child('users/' + uid + '/share/wishlist');
    };

    Utils.refWishPictures = function(uid, wishId) {
        return refRoot.child('users/' + uid + '/share/pictures/' + wishId);
    };

    Utils.refShareList = function(uid) {
        return refRoot.child('users/' + uid + '/private/shareList');
    };

    Utils.refBeSharedList = function(uid) {
        return refRoot.child('users/' + uid + '/public/besharedList');
    };

    Utils.refDisplayName = function(uid) {
        return refRoot.child('users/' + uid + '/share/displayName/');
    };

    Utils.refProfile = function(uid) {
        return refRoot.child('users/' + uid + '/private/profile/');
    };

    /* Firebase keys cannot have a period (.) in them, so this converts the emails to valid keys */
    Utils.emailToKey = function(emailAddress) {
        return emailAddress.replace(/\./g, ',');
    };

    Utils.validateEmail = function(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    };

    Utils.validateUrl = function(url) {
        var re = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        return re.test(url);
    };

    Utils.toastLong = function(message) {
        try {
            $cordovaToast.showLongBottom(message);
        } catch (err) {
            console.log(message);
        }
    };

    Utils.toastShort = function(message) {
        console.log(message);
        try {
            $cordovaToast.showShortBottom(message);
        } catch (err) {
            console.log(message);
        }
    };

    return Utils;
})

.factory('Camera', ['$q', function($q) {
    return {
        getPicture: function(camera) {
            var q = $q.defer();

            navigator.camera.getPicture(function(result) {
                // Do any magic you need
                q.resolve(result);
            }, function(err) {
                q.reject(err);
            }, {
                quality: 75,
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: camera ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY,
                allowEdit: false,
                encodingType: Camera.EncodingType.JPEG,
                targetWidth: 1000,
                targetHeight: 1000,
                correctOrientation: true,
                saveToPhotoAlbum: false
            });

            return q.promise;
        }
    };
}]);
