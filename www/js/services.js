angular.module('app.services', ['ngCordova'])

.factory('Utils', function($cordovaToast) {
    var Utils = {};

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

.factory('Ref', function() {
    var Ref = {};

    var refRoot = new Firebase("https://lovers-wish.firebaseio.com/");

    Ref.root = function() {
        return refRoot;
    };

    Ref.emailUidMap = function() {
        return refRoot.child('sys/emailUidMap/');
    };

    Ref.wishlist = function(uid) {
        return refRoot.child('users/' + uid + '/share/wishlist');
    };

    Ref.wishPictures = function(uid, wishId) {
        return refRoot.child('users/' + uid + '/share/pictures/' + wishId);
    };

    Ref.shareList = function(uid) {
        return refRoot.child('users/' + uid + '/private/shareList');
    };

    Ref.beSharedList = function(uid) {
        return refRoot.child('users/' + uid + '/public/besharedList');
    };

    Ref.displayName = function(uid) {
        return refRoot.child('users/' + uid + '/share/displayName/');
    };

    Ref.profile = function(uid) {
        return refRoot.child('users/' + uid + '/private/profile/');
    };

    return Ref;
})

.factory("Auth", ["$firebaseAuth", "Ref", function($firebaseAuth, Ref) {
    return $firebaseAuth(Ref.root());
}])

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
